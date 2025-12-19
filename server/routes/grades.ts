import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role, id } = req.user as { role: string; id: string };
    const userId = Number(id);

    let query = "";
    let params: any[] = [];

    if (role === "admin") {
      query = `
        SELECT g.id, g.student_id, u.name AS student_name, 
               g.course_id, c.title AS course_title, g.grade, g.grade_type, g.created_at
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON g.course_id = c.id
        ORDER BY g.created_at DESC`;
    } else {
      query = `
        SELECT g.id, c.title AS course_title, g.grade, g.grade_type, g.created_at
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN courses c ON g.course_id = c.id
        WHERE s.user_id = $1
        ORDER BY g.created_at DESC`;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching grades:", err);
    res.status(500).json({ message: "Error al obtener calificaciones" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { student_id, course_id, grade, grade_type } = req.body;
    const result = await pool.query(
      `INSERT INTO grades (student_id, course_id, grade, grade_type) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, course_id, grade, grade_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al crear registro" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, grade_type, student_id, course_id } = req.body;
    const result = await pool.query(
      `UPDATE grades SET grade = $1, grade_type = $2, student_id = $3, course_id = $4 
       WHERE id = $5 RETURNING *`,
      [grade, grade_type, student_id, course_id, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ message: "No encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM grades WHERE id = $1", [req.params.id]);
    res.json({ message: "Calificación eliminada" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar" });
  }
});

export default router;