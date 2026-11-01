import { readPage, addFilters, addSearch } from "../utils/pagination";
import { courseAccess } from "../utils/courseAccess";
import { isoDate } from "../utils/validation";
import { businessDate } from "../utils/businessDate";
import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, canTeach, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

router.post("/", verifyToken, canTeach, async (req: AuthRequest, res: Response) => {
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
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, course_id, date)
       DO UPDATE SET
          status = EXCLUDED.status,
          topic_id = EXCLUDED.topic_id
       RETURNING id, student_id, course_id, date, status, topic_id`,
      [targetStudentId, courseIdNum, date, status, topicIdNum]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Error recording attendance" });
  }
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
router.get("/report", verifyToken, async (req: AuthRequest, res: Response) => {
  const { params, select } = attendanceQuery(req);
  res.json((await pool.query(select + " ORDER BY a.date DESC,a.id DESC", params)).rows);
});
router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const { params, select } = attendanceQuery(req);
  const today = businessDate();
  res.json(await readPage(req, select, params, { student_id: "student", student_name: "student", course_id: "course", course_title: "course", date: "date", status: "status", topic: "topic" }, "date",
    `jsonb_build_object('totalPresent',COUNT(*) FILTER(WHERE status='Present'),'uniqueStudents',COUNT(DISTINCT student_id) FILTER(WHERE status='Present'),'activeCourses',COUNT(DISTINCT course_id) FILTER(WHERE status='Present'),'todayCount',COUNT(*) FILTER(WHERE status='Present' AND date=DATE '${today}'))`));
});
export default router;
