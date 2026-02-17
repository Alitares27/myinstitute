import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        tt.id,
        tt.temple_id,
        t.name AS temple_name,
        tt.trip_date AS date,
        tt.status,
        tt.cost
      FROM temple_trips tt
      JOIN temples t ON tt.temple_id = t.id
      ORDER BY tt.trip_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching temple trips:", err);
    res.status(500).json({ message: "Error al obtener los viajes al templo" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { temple_id, date, status, cost } = req.body;

    if (!temple_id || !date || !cost) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    const result = await pool.query(
      `INSERT INTO temple_trips (temple_id, trip_date, status, cost)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [temple_id, date, status || "programado", cost]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("❌ Error creating temple trip:", err);
    res.status(500).json({ message: "Error al crear el viaje" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { temple_id, date, status, cost } = req.body;

    const result = await pool.query(
      `UPDATE temple_trips
       SET temple_id = $1,
           trip_date = $2,
           status = $3,
           cost = $4
       WHERE id = $5
       RETURNING *`,
      [temple_id, date, status, cost, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("❌ Error updating temple trip:", err);
    res.status(500).json({ message: "Error al actualizar el viaje" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM temple_trips WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    res.json({ message: "Viaje eliminado correctamente" });

  } catch (err) {
    console.error("❌ Error deleting temple trip:", err);
    res.status(500).json({ message: "Error al eliminar el viaje" });
  }
});

export default router;
