import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, id } = req.user as { role: string; id: string };
    const userId = Number(id);

    const { student_id, course_id, date, status } = req.body;

    if (!course_id || !date || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const targetStudentId =
      role === "student" ? userId : Number(student_id ?? 0);

    if (!targetStudentId || isNaN(targetStudentId)) {
      return res.status(400).json({ message: "Student ID required" });
    }

    const courseIdNum = Number(course_id);
    if (isNaN(courseIdNum)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const result = await pool.query(
      `INSERT INTO attendance (student_id, course_id, date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, course_id, date)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING id, student_id, course_id, date, status`,
      [targetStudentId, courseIdNum, date, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Attendance error:", err);
    res.status(500).json({ message: "Error recording attendance" });
  }
});

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, id } = req.user as { role: string; id: string };
    const userId = Number(id);

    let result;

    if (role === "admin") {
      result = await pool.query(`
        SELECT a.id, a.student_id, u.name AS student, a.course_id, c.title AS course, a.date, a.status
        FROM attendance a
        JOIN users u ON a.student_id = u.id
        JOIN courses c ON a.course_id = c.id
        ORDER BY a.date DESC
      `);
    } else if (role === "student") {
      
      result = await pool.query(
        `SELECT a.id, a.student_id, a.course_id, c.title AS course, a.date, a.status
         FROM attendance a
         JOIN courses c ON a.course_id = c.id
         WHERE a.student_id = $1
         ORDER BY a.date DESC`,
        [userId]
      );
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Attendance fetch error:", err);
    res.status(500).json({ message: "Error fetching attendance" });
  }
});

export default router;