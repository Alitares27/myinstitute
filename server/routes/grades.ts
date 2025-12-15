import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === "admin") {
      const result = await pool.query(`
        SELECT g.id, s.user_id, u.name AS student_name, 
               c.title AS course_title, g.grade, g.grade_type, g.created_at
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON g.course_id = c.id
        ORDER BY u.name ASC, c.title ASC
      `);
      return res.json(result.rows); 
    } else if (req.user?.role === "student") {
      const result = await pool.query(
        `
        SELECT g.id, c.title AS course_title, g.grade, g.grade_type, g.created_at
        FROM grades g
        JOIN students s ON g.student_id = s.id
        JOIN courses c ON g.course_id = c.id
        WHERE s.user_id = $1
        ORDER BY c.title ASC
      `,
        [req.user.id]
      );
      return res.json(result.rows); 
    } else {
      return res.status(403).json({ message: "Acceso denegado" });
    }
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
       VALUES ($1, $2, $3, $4) 
       RETURNING id, student_id, course_id, grade, grade_type, created_at`,
      [student_id, course_id, grade, grade_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating grade:", err);
    res.status(500).json({ message: "Error al crear calificación" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { grade, grade_type } = req.body;
    const result = await pool.query(
      `UPDATE grades 
       SET grade = $1, grade_type = $2 
       WHERE id = $3 
       RETURNING id, student_id, course_id, grade, grade_type, created_at`,
      [grade, grade_type, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Calificación no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating grade:", err);
    res.status(500).json({ message: "Error al actualizar calificación" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "DELETE FROM grades WHERE id = $1 RETURNING id, student_id, course_id, grade, grade_type, created_at",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Calificación no encontrada" });
    }
    res.json({ message: "Calificación eliminada correctamente", data: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting grade:", err);
    res.status(500).json({ message: "Error al eliminar calificación" });
  }
});

export default router;