import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT e.*, s.id AS student_id, s.grade, c.title AS course_title
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching enrollments" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, course_id } = req.body;

    const existing = await pool.query(
      "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2",
      [student_id, course_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Este estudiante ya está inscrito en este curso" });
    }

    const result = await pool.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *",
      [student_id, course_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating enrollment" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { student_id, course_id } = req.body;

    const existing = await pool.query(
      "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2 AND id != $3",
      [student_id, course_id, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Este estudiante ya está inscrito en este curso" });
    }

    const result = await pool.query(
      "UPDATE enrollments SET student_id = $1, course_id = $2 WHERE id = $3 RETURNING *",
      [student_id, course_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Matrícula no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating enrollment" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM enrollments WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Matrícula no encontrada" });
    }
    res.json({ message: "Matrícula eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting enrollment" });
  }
});

export default router;