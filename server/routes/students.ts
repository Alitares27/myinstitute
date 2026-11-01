import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    let query = `
      SELECT DISTINCT s.id, s.grade, s.enrollment_date, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM students s
      JOIN users u ON s.user_id = u.id
    `;
    let values: any[] = [];

    if (role === "teacher") {
      query += `
        JOIN enrollments e ON e.student_id = s.id
        JOIN courses c ON c.id = e.course_id
        JOIN teachers t ON t.id = c.teacher_id
        WHERE t.user_id = $1
      `;
      values.push(userId);
    } else if (role === "student") {
      query += ` WHERE s.user_id = $1 `;
      values.push(userId);
    }

    query += ` ORDER BY u.name ASC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener miembros" });
  }
});

export default router;
