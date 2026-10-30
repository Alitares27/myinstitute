import { cents, isoDate, positiveId, InputError } from "../utils/validation";
import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

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

    positiveId(temple_id); isoDate(date); cents(cost);
    if (status && !["programado", "cancelado", "finalizado", "completado", "en_curso"].includes(status)) return res.status(400).json({ message: "Estado inválido" });
    if (!temple_id || !date || cost === undefined || cost === "") {
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
    if (err instanceof InputError) return res.status(400).json({ message: err.message });
    console.error("❌ Error creating temple trip:", err);
    res.status(500).json({ message: "Error al crear el viaje" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const id = positiveId(req.params.id);
  const { temple_id, date, status, cost } = req.body;
  positiveId(temple_id); isoDate(date); const costCents = cents(cost);
  if (!["programado", "cancelado", "finalizado", "completado", "en_curso"].includes(status)) throw new InputError("Estado inválido");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const trip = await client.query("SELECT id FROM temple_trips WHERE id=$1 FOR UPDATE", [id]);
    if (!trip.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Viaje no encontrado" }); }
    const reservations = await client.query("SELECT id,advance_payment FROM temple_attendance WHERE trip_id=$1 ORDER BY id FOR UPDATE", [id]);
    if (reservations.rows.some(row => cents(row.advance_payment) > costCents)) throw new InputError("El costo no puede ser menor que los pagos recibidos");
    const result = await client.query("UPDATE temple_trips SET temple_id=$1,trip_date=$2,status=$3,cost=$4 WHERE id=$5 RETURNING *", [temple_id,date,status,costCents/100,id]);
    await client.query("UPDATE temple_attendance SET pending_payment=$1-advance_payment WHERE trip_id=$2", [costCents/100,id]);
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const tripRes = await client.query("SELECT id FROM temple_trips WHERE id = $1", [id]);
    if (tripRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    await client.query("DELETE FROM temple_amortizations WHERE attendance_id IN (SELECT id FROM temple_attendance WHERE trip_id = $1)", [id]);
    await client.query("DELETE FROM temple_attendance WHERE trip_id = $1", [id]);
    await client.query("DELETE FROM temple_trips WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Viaje eliminado correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error deleting temple trip:", err);
    res.status(500).json({ message: "Error al eliminar el viaje" });
  } finally {
    client.release();
  }
});

export default router;
