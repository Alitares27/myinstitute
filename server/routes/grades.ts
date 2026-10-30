import { Response } from "express";
import { asyncRouter } from "../middleware/asyncRouter";
import { pool } from "../models/db";
import { verifyToken, canTeach, AuthRequest } from "../middleware/auth";
import { positiveId, InputError } from "../utils/validation";
const router = asyncRouter();
const owner = `(c.teacher_id IN (SELECT id FROM teachers WHERE user_id = $2))`;
router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(`SELECT g.*, u.name AS student_name, c.title AS course_title
    FROM grades g JOIN students s ON s.id=g.student_id JOIN users u ON u.id=s.user_id JOIN courses c ON c.id=g.course_id
    WHERE ($1 = 'admin' OR ($1 = 'teacher' AND ${owner}) OR ($1 = 'student' AND s.user_id=$2)) ORDER BY g.created_at DESC, g.id DESC`, [req.user!.role, req.user!.id]);
  res.json(result.rows);
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
