import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.title, c.teacher_id, c.created_at,
             u.name AS teacher_name, u.email AS teacher_email
      FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Error fetching courses" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, teacher_id } = req.body;

    if (!title || !teacher_id) {
      return res.status(400).json({ message: "title y teacher_id son requeridos" });
    }

    const result = await pool.query(
      "INSERT INTO courses (title, teacher_id) VALUES ($1, $2) RETURNING *",
      [title, teacher_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ message: "Error creating course" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, teacher_id } = req.body;

    const result = await pool.query(
      "UPDATE courses SET title = $1, teacher_id = $2 WHERE id = $3 RETURNING *",
      [title, teacher_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ message: "Error updating course" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM courses WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ message: "Error deleting course" });
  }
});

export default router;