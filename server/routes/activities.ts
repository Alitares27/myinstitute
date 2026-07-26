import { Router, Request, Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, a.activity_datetime::text AS activity_datetime, u.name AS assigned_to_name
       FROM activity_plans a
       LEFT JOIN users u ON a.assigned_to = u.id
       ORDER BY a.activity_datetime DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener actividades" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      activity_name, activity_datetime, assigned_to,
      purpose, description, attendance, budget,
      assignments, spiritual, social, physical, intellectual,
    } = req.body;

    if (!activity_name) return res.status(400).json({ message: "El nombre es requerido" });
    if (!activity_datetime) return res.status(400).json({ message: "La fecha y hora son requeridas" });

    const result = await pool.query(
      `INSERT INTO activity_plans
        (activity_name, activity_datetime, assigned_to,
         purpose, description, attendance, budget,
         assignments, spiritual, social, physical, intellectual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        activity_name, activity_datetime, assigned_to || null,
        purpose || null, description || null,
        attendance ? Number(attendance) : null,
        budget ? Number(budget) : null,
        assignments || null,
        spiritual || false, social || false, physical || false, intellectual || false,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating activity:", err);
    res.status(500).json({ message: "Error al crear actividad" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      activity_name, activity_datetime, assigned_to,
      purpose, description, attendance, budget,
      assignments, spiritual, social, physical, intellectual,
    } = req.body;

    const result = await pool.query(
      `UPDATE activity_plans SET
        activity_name = $1, activity_datetime = $2,
        assigned_to = $3, purpose = $4, description = $5,
        attendance = $6, budget = $7,
        assignments = $8, spiritual = $9, social = $10,
        physical = $11, intellectual = $12,
        updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        activity_name, activity_datetime, assigned_to || null,
        purpose || null, description || null,
        attendance ? Number(attendance) : null,
        budget ? Number(budget) : null,
        assignments || null,
        spiritual || false, social || false, physical || false, intellectual || false, id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Actividad no encontrada" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating activity:", err);
    res.status(500).json({ message: "Error al actualizar actividad" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM activity_plans WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Actividad no encontrada" });
    res.json({ message: "Actividad eliminada correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar actividad" });
  }
});

export default router;
