import { positiveId } from "../utils/validation";
import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, city, province, address, dedicated_date, status, archived_at
       FROM temples
       WHERE ($1::boolean OR archived_at IS NULL)
       ORDER BY name ASC`, [req.user?.role === "admin" && req.query.include_archived === "true"]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching temples:", err);
    res.status(500).json({ message: "Error al obtener los templos" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
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

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
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

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const templeRes = await client.query("SELECT id FROM temples WHERE id = $1 FOR UPDATE", [id]);
    if (templeRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Templo no encontrado" });
    }

    await client.query("SELECT id FROM temple_trips WHERE temple_id = $1 ORDER BY id FOR UPDATE", [id]);
    const reservations = await client.query(`SELECT ta.id,ta.advance_payment FROM temple_attendance ta JOIN temple_trips tt ON tt.id=ta.trip_id WHERE tt.temple_id=$1 ORDER BY ta.id FOR UPDATE OF ta`, [id]);
    const payments = await client.query(`SELECT tam.id FROM temple_amortizations tam JOIN temple_attendance ta ON ta.id=tam.attendance_id JOIN temple_trips tt ON tt.id=ta.trip_id WHERE tt.temple_id=$1 LIMIT 1`, [id]);
    const history=await client.query(`SELECT e.id FROM financial_events e JOIN temple_attendance ta ON ta.id=e.reservation_id JOIN temple_trips tt ON tt.id=ta.trip_id WHERE tt.temple_id=$1 LIMIT 1`,[id]);
    if (payments.rowCount || history.rowCount || reservations.rows.some(row=>Number(row.advance_payment)!==0)) {
      await client.query("ROLLBACK");
      return res.status(409).json({message:"El templo tiene movimientos financieros. Archívalo para conservar su historial."});
    }
    await client.query("DELETE FROM temple_attendance WHERE trip_id IN (SELECT id FROM temple_trips WHERE temple_id=$1)", [id]);
    await client.query("DELETE FROM temple_trips WHERE temple_id = $1", [id]);
    await client.query("DELETE FROM temples WHERE id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Templo eliminado correctamente" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error deleting temple:", err);
    res.status(500).json({ message: "Error al eliminar templo" });
  } finally {
    client.release();
  }
});

router.patch("/:id/archive", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const result=await client.query("UPDATE temples SET archived_at=COALESCE(archived_at,NOW()) WHERE id=$1 RETURNING id",[positiveId(req.params.id)]);
    if(!result.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Templo no encontrado"});}
    await client.query("UPDATE temple_trips SET archived_at=COALESCE(archived_at,NOW()) WHERE temple_id=$1",[req.params.id]);
    await client.query("COMMIT");res.json({message:"Templo y viajes archivados; historial conservado"});
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
});
export default router;
