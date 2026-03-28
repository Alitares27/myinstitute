import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    let query = `
      SELECT DISTINCT t.id, t.specialty, t.created_at, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM teachers t
      JOIN users u ON t.user_id = u.id
    `;
    let values: any[] = [];

    if (role === "student") {
      query += `
        JOIN courses c ON c.teacher_id = t.id
        JOIN enrollments e ON e.course_id = c.id
        JOIN students s ON s.id = e.student_id
        WHERE s.user_id = $1
      `;
      values.push(userId);
    } else if (role === "teacher") {
      query += ` WHERE t.user_id = $1 `;
      values.push(userId);
    }

    query += ` ORDER BY u.name ASC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ message: "Error fetching teachers" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, specialty } = req.body;

    if (!user_id || !specialty) {
      return res.status(400).json({ message: "user_id y specialty son requeridos" });
    }

    const result = await pool.query(
      "INSERT INTO teachers (user_id, specialty) VALUES ($1, $2) RETURNING *",
      [user_id, specialty]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating teacher:", err);
    res.status(500).json({ message: "Error creating teacher" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { specialty } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE teachers SET specialty = $1 WHERE id = $2 RETURNING *",
      [specialty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating teacher:", err);
    res.status(500).json({ message: "Error updating teacher" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM teachers WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ message: "Error deleting teacher" });
  }
});

export default router;