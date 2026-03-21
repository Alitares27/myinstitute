import { Router, Request, Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM temas ORDER BY title ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener temas" });
  }
});

router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "El título es requerido" });
    const result = await pool.query(
      "INSERT INTO temas (title) VALUES ($1) RETURNING *",
      [title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al crear tema" });
  }
});

router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "El título es requerido" });
    const result = await pool.query(
      "UPDATE temas SET title = $1 WHERE id = $2 RETURNING *",
      [title, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Tema no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar tema" });
  }
});

router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM temas WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Tema no encontrado" });
    res.json({ message: "Tema eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar tema" });
  }
});

export default router;