import { readPage, addFilters, addSearch } from "../utils/pagination";
import { courseAccess } from "../utils/courseAccess";
import { isoDate, positiveId } from "../utils/validation";
import { businessDate } from "../utils/businessDate";
import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, canTeach, AuthRequest, requireModuleAccess } from "../middleware/auth";

const router = asyncRouter();

router.post("/", verifyToken, requireModuleAccess("asistencia"), canTeach, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { role, id: userId } = user;
    const { student_id, course_id, date, status, topic_id } = req.body;

    if (!course_id || !date || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let targetStudentId = Number(student_id ?? 0);


    if (!targetStudentId || isNaN(targetStudentId)) {
      return res.status(400).json({ message: "Student ID required" });
    }

    const courseIdNum = Number(course_id);
    const topicIdNum = topic_id ? Number(topic_id) : null;

    if (isNaN(courseIdNum)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    if (role === "teacher") {
      const courseCheck = await pool.query(
        "SELECT id FROM courses WHERE id = $1 AND teacher_id = (SELECT id FROM teachers WHERE user_id = $2)",
        [courseIdNum, userId]
      );
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ message: "No tienes permiso para registrar asistencia en este curso." });
      }
    }

    if (!Number.isSafeInteger(targetStudentId) || targetStudentId <= 0 || !Number.isSafeInteger(courseIdNum) || courseIdNum <= 0 ||
      !["Present", "Absent"].includes(status) || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > businessDate()) {
      return res.status(400).json({ message: "Asistencia inválida: revisa fecha, estado y curso" });
    }
    const enrollment = await pool.query("SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2", [targetStudentId, courseIdNum]);
    if (!enrollment.rowCount) return res.status(400).json({ message: "El estudiante no está matriculado en el curso" });
    if (topicIdNum !== null) {
      const topic = await pool.query("SELECT id FROM topics WHERE id = $1 AND course_id = $2", [topicIdNum, courseIdNum]);
      if (!topic.rowCount) return res.status(400).json({ message: "El tema no pertenece al curso" });
    }
    const result = await pool.query(
      `INSERT INTO attendance (student_id, course_id, date, status, topic_id)
       SELECT $1, c.id, $3, $4, $5
       FROM courses c
       JOIN enrollments e ON e.course_id=c.id AND e.student_id=$1
       WHERE c.id=$2 AND ($6='admin' OR c.teacher_id IN (SELECT id FROM teachers WHERE user_id=$7))
         AND ($5::integer IS NULL OR EXISTS (SELECT 1 FROM topics t WHERE t.id=$5 AND t.course_id=c.id))
       FOR SHARE OF c, e
       ON CONFLICT (student_id, course_id, date)
       DO UPDATE SET
          status = EXCLUDED.status,
          topic_id = EXCLUDED.topic_id
       RETURNING id, student_id, course_id, date, status, topic_id`,
      [targetStudentId, courseIdNum, date, status, topicIdNum, role, userId]
    );

    if (!result.rowCount) return res.status(403).json({ message: "Ya no se permite registrar asistencia en este curso." });
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Error recording attendance" });
  }
});

router.put("/:id", verifyToken, requireModuleAccess("asistencia"), canTeach, async (req: AuthRequest, res: Response) => {
  const id = positiveId(req.params.id);
  const date = isoDate(req.body?.date);
  const { status, topic_id } = req.body;
  if (!["Present", "Absent"].includes(status) || date > businessDate()) {
    return res.status(400).json({ message: "Asistencia inválida: revisa la fecha y el estado." });
  }
  const topicId = topic_id == null || topic_id === "" ? null : positiveId(topic_id);
  try {
    const result = await pool.query(
      `WITH allowed_course AS (
         SELECT c.id FROM attendance existing_record
         JOIN courses c ON c.id=existing_record.course_id
         WHERE existing_record.id=$1 AND ${courseAccess("c", "$2", "$3")}
         FOR SHARE OF c
       )
       UPDATE attendance a SET date=$4, status=$5, topic_id=$6
       FROM allowed_course
       WHERE a.id=$1 AND a.course_id=allowed_course.id
         AND ($6::integer IS NULL OR EXISTS (SELECT 1 FROM topics t WHERE t.id=$6 AND t.course_id=a.course_id))
       RETURNING a.*`,
      [id, req.user!.role, req.user!.id, date, status, topicId]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Asistencia no disponible o capítulo inválido." });
    res.json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: "Ya hay una asistencia del miembro para esa fecha y curso." });
    }
    throw error;
  }
});

router.delete("/:id", verifyToken, requireModuleAccess("asistencia"), canTeach, async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `WITH allowed_course AS (
       SELECT c.id FROM attendance existing_record
       JOIN courses c ON c.id=existing_record.course_id
       WHERE existing_record.id=$1 AND ${courseAccess("c", "$2", "$3")}
       FOR SHARE OF c
     )
     DELETE FROM attendance a USING allowed_course
     WHERE a.id=$1 AND a.course_id=allowed_course.id RETURNING a.id`,
    [positiveId(req.params.id), req.user!.role, req.user!.id]
  );
  if (!result.rowCount) return res.status(404).json({ message: "Asistencia no encontrada." });
  res.json({ message: "Asistencia eliminada." });
});

function attendanceQuery(req: AuthRequest) {
  const params: any[] = [req.user!.role, req.user!.id];
  const where = [courseAccess("c", "$1", "$2"), "($1 <> 'student' OR s.user_id=$2)", ...addFilters(req, params, { student_id: "a.student_id", course_id: "a.course_id" }), ...addSearch(req, params, ["u.name", "c.title", "t.title"])];
  if (req.query.date) { params.push(isoDate(req.query.date)); where.push(`a.date=$${params.length}`); }
  const select = `SELECT a.id,a.student_id,u.name AS student,a.course_id,c.title AS course,a.date,a.status,t.title AS topic,a.topic_id
    FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id
    JOIN courses c ON c.id=a.course_id LEFT JOIN topics t ON t.id=a.topic_id
    WHERE ${where.join(" AND ")}`;
  return { params, select };
}
router.get("/report", verifyToken, requireModuleAccess("asistencia"), async (req: AuthRequest, res: Response) => {
  const { params, select } = attendanceQuery(req);
  res.json((await pool.query(select + " ORDER BY a.date DESC,a.id DESC", params)).rows);
});
router.get("/", verifyToken, requireModuleAccess("asistencia"), async (req: AuthRequest, res: Response) => {
  const { params, select } = attendanceQuery(req);
  const today = businessDate();
  res.json(await readPage(req, select, params, { student_id: "student", student_name: "student", course_id: "course", course_title: "course", date: "date", status: "status", topic: "topic" }, "date",
    `jsonb_build_object('totalPresent',COUNT(*) FILTER(WHERE status='Present'),'uniqueStudents',COUNT(DISTINCT student_id) FILTER(WHERE status='Present'),'activeCourses',COUNT(DISTINCT course_id) FILTER(WHERE status='Present'),'todayCount',COUNT(*) FILTER(WHERE status='Present' AND date=DATE '${today}'))`));
});
export default router;
