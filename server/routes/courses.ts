import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/:id/topics", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, title, description, order_index 
       FROM topics 
       WHERE course_id = $1 
       ORDER BY order_index ASC, id ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching topics:", err);
    res.status(500).json({ message: "Error al obtener los temas del curso" });
  }
});

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, 
        c.title, 
        c.description, 
        c.teacher_id, 
        u.name AS teacher_name
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY c.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ message: "Error interno al obtener los cursos" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, teacher_id } = req.body;
    if (!title) return res.status(400).json({ message: "El título es obligatorio" });

    const result = await pool.query(
      "INSERT INTO courses (title, description, teacher_id) VALUES ($1, $2, $3) RETURNING *",
      [title, description || "", teacher_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating course:", err);
    res.status(500).json({ message: "Error al crear el curso" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, teacher_id } = req.body;
    const result = await pool.query(
      "UPDATE courses SET title = $1, description = $2, teacher_id = $3 WHERE id = $4 RETURNING *",
      [title, description, teacher_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Curso no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating course:", err);
    res.status(500).json({ message: "Error al actualizar el curso" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM courses WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Curso no encontrado" });
    res.json({ message: "Curso eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error deleting course:", err);
    res.status(500).json({ message: "Error al eliminar el curso" });
  }
});

export default router;