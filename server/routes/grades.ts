import { readPage, addFilters, addSearch } from "../utils/pagination";
import { Response } from "express";
import { asyncRouter } from "../middleware/asyncRouter";
import { pool } from "../models/db";
import { verifyToken, canTeach, AuthRequest } from "../middleware/auth";
import { positiveId, InputError } from "../utils/validation";
const router = asyncRouter();
const owner = `(c.teacher_id IN (SELECT id FROM teachers WHERE user_id = $2))`;
function gradesQuery(req:AuthRequest){
  const params:any[]=[req.user!.role,req.user!.id];
  const where=[`($1='admin' OR ($1='teacher' AND ${owner}) OR ($1='student' AND s.user_id=$2))`,
    ...addFilters(req,params,{student_id:"g.student_id",course_id:"g.course_id"}),...addSearch(req,params,["u.name","c.title"])];
  if(req.query.grade_type){params.push(String(req.query.grade_type));where.push(`g.grade_type=$${params.length}`);}
  return {params,select:`SELECT g.*,u.name AS student_name,c.title AS course_title FROM grades g JOIN students s ON s.id=g.student_id JOIN users u ON u.id=s.user_id JOIN courses c ON c.id=g.course_id WHERE ${where.join(" AND ")}`};
}
router.get("/report",verifyToken,async(req:AuthRequest,res:Response)=>{
  const {select,params}=gradesQuery(req);res.json((await pool.query(select+" ORDER BY g.created_at DESC,g.id DESC",params)).rows);
});
router.get("/",verifyToken,async(req:AuthRequest,res:Response)=>{
  const {select,params}=gradesQuery(req);
  res.json(await readPage(req,select,params,{student_name:"student_name",course_title:"course_title",grade:"grade",grade_type:"grade_type",created_at:"created_at"},"created_at",
    "jsonb_build_object('averageGrade',AVG(grade),'distinctCourses',COUNT(DISTINCT course_id),'distinctStudents',COUNT(DISTINCT student_id))"));
});

function gradeInput(body: any) {
  const student = positiveId(body.student_id), course = positiveId(body.course_id);
  const grade = Number(body.grade);
  if (body.grade === "" || body.grade == null || !Number.isFinite(grade) || grade < 0 || grade > 100 || !["examen", "Lectura", "participacion"].includes(body.grade_type)) throw new InputError("Calificación inválida (0–100) o tipo no permitido");
  return [student, course, grade, body.grade_type];
}
router.post("/", verifyToken, canTeach, async (req: AuthRequest, res: Response) => {
  const values = gradeInput(req.body);
  const result = await pool.query(`INSERT INTO grades (student_id,course_id,grade,grade_type)
    SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id
      WHERE e.student_id=$1 AND e.course_id=$2 AND ($5='admin' OR c.teacher_id IN (SELECT id FROM teachers WHERE user_id=$6))) RETURNING *`, [...values, req.user!.role, req.user!.id]);
  if (!result.rowCount) return res.status(403).json({ message: "Sin permiso o estudiante no matriculado" });
  res.status(201).json(result.rows[0]);
});
router.put("/:id", verifyToken, canTeach, async (req: AuthRequest, res: Response) => {
  const values = gradeInput(req.body);
  const result = await pool.query(`UPDATE grades g SET student_id=$1,course_id=$2,grade=$3,grade_type=$4 WHERE g.id=$7
    AND EXISTS (SELECT 1 FROM courses old WHERE old.id=g.course_id AND ($5='admin' OR old.teacher_id IN (SELECT id FROM teachers WHERE user_id=$6)))
    AND EXISTS (SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND e.course_id=$2
      AND ($5='admin' OR c.teacher_id IN (SELECT id FROM teachers WHERE user_id=$6))) RETURNING *`, [...values, req.user!.role, req.user!.id, positiveId(req.params.id)]);
  if (!result.rowCount) return res.status(403).json({ message: "Sin permiso, registro inexistente o estudiante no matriculado" });
  res.json(result.rows[0]);
});
router.delete("/:id", verifyToken, canTeach, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`DELETE FROM grades g USING courses c WHERE g.course_id=c.id AND g.id=$1
    AND ($2='admin' OR c.teacher_id IN (SELECT id FROM teachers WHERE user_id=$3)) RETURNING g.id`, [positiveId(req.params.id), req.user!.role, req.user!.id]);
  if (!result.rowCount) return res.status(403).json({ message: "Sin permiso o registro inexistente" });
  res.json({ message: "Calificación eliminada" });
});
export default router;
