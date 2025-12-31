import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { course_id } = req.query;
    let query = "SELECT * FROM topics";
    const params = [];

    if (course_id) {
      query += " WHERE course_id = $1";
      params.push(course_id);
    }
    
    query += " ORDER BY course_id, order_index ASC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener temas" });
  }
});

router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  const { course_id, title, description, order_index } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO topics (course_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
      [course_id, title, description, order_index || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al crear tema" });
  }
});

router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, order_index } = req.body;
  try {
    const result = await pool.query(
      "UPDATE topics SET title = $1, description = $2, order_index = $3 WHERE id = $4 RETURNING *",
      [title, description, order_index, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar" });
  }
});

router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM topics WHERE id = $1", [id]);
    res.json({ message: "Tema eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar" });
  }
});

export default router;