import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, city, province, address, dedicated_date, status
       FROM temples
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching temples:", err);
    res.status(500).json({ message: "Error al obtener los templos" });
  }
});

router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, city, province, address, dedicated_date, status } = req.body;
    if (!name) return res.status(400).json({ message: "El nombre es requerido" });
    const result = await pool.query(
      `INSERT INTO temples (name, city, province, address, dedicated_date, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, city || null, province || null, address || null, dedicated_date || null, status || "operating"]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating temple:", err);
    res.status(500).json({ message: "Error al crear templo" });
  }
});

router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, city, province, address, dedicated_date, status } = req.body;
    const result = await pool.query(
      `UPDATE temples SET name = $1, city = $2, province = $3, address = $4, dedicated_date = $5, status = $6
       WHERE id = $7 RETURNING *`,
      [name, city || null, province || null, address || null, dedicated_date || null, status || "operating", id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Templo no encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating temple:", err);
    res.status(500).json({ message: "Error al actualizar templo" });
  }
});

router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM temples WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Templo no encontrado" });
    res.json({ message: "Templo eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error deleting temple:", err);
    res.status(500).json({ message: "Error al eliminar templo" });
  }
});

export default router;
