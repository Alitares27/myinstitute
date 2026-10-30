import { Request, Response } from "express";
import { pool } from "../models/db";
import { positiveId, isoDate, reservationBalance, InputError } from "../utils/validation";

const reservationSelect = `SELECT tr.*, u.name AS user_name, u.document AS user_document,
  tp.trip_date, tp.cost, t.name AS temple_name,
  COALESCE(pay.total_amortizado, 0) AS total_amortizado, COALESCE(pay.num_pagos, 0)::int AS num_pagos
  FROM temple_attendance tr JOIN users u ON u.id = tr.user_id
  JOIN temple_trips tp ON tp.id = tr.trip_id JOIN temples t ON t.id = tp.temple_id
  LEFT JOIN (SELECT attendance_id, SUM(payment_amount) AS total_amortizado, COUNT(*) AS num_pagos
    FROM temple_amortizations GROUP BY attendance_id) pay ON pay.attendance_id = tr.id`;

export async function getReservations(req: Request, res: Response) {
  const page = positiveId(req.query.page || 1);
  const limit = Math.min(positiveId(req.query.limit || 20), 100);
  const params: any[] = [];
  const filters: string[] = [];
  for (const [key, column] of [["trip_id", "tr.trip_id"], ["user_id", "tr.user_id"]]) {
    if (req.query[key]) { params.push(positiveId(req.query[key])); filters.push(`${column} = $${params.length}`); }
  }
  if (req.query.search) {
    params.push(`%${String(req.query.search).slice(0, 100)}%`);
    filters.push(`(u.name ILIKE $${params.length} OR to_char(tp.trip_date, 'DD/MM/YYYY') ILIKE $${params.length})`);
  }
  const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
  const sorts: Record<string, string> = { user_name: "user_name", trip_date: "trip_date", adelanto: "(advance_payment - total_amortizado)", abonos: "total_amortizado", pagado: "advance_payment", saldo: "pending_payment" };
  const order = sorts[String(req.query.sort)] || "id";
  const direction = req.query.direction === "asc" ? "ASC" : "DESC";
  const base = reservationSelect + where;
  const result = await pool.query(`WITH filtered AS (${base})
    SELECT (SELECT COALESCE(json_agg(rows), '[]'::json) FROM (
      SELECT * FROM filtered ORDER BY ${order} ${direction}, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    ) rows) AS items, COUNT(*)::int AS total,
    COALESCE(SUM(advance_payment), 0) AS total_paid, COALESCE(SUM(pending_payment), 0) AS total_pending FROM filtered`, [...params, limit, (page - 1) * limit]);
  res.json({ ...result.rows[0], page, limit });
}

export async function reservationOptions(req: Request, res: Response) {
  const trip = positiveId(req.query.trip_id);
  const result = await pool.query(`SELECT tr.id, tr.user_id, tr.trip_id, u.name AS user_name,
    tr.advance_payment, tr.pending_payment FROM temple_attendance tr
    JOIN users u ON u.id = tr.user_id WHERE tr.trip_id = $1 ORDER BY u.name`, [trip]);
  res.json(result.rows);
}

export async function reservationReport(req: Request, res: Response) {
  const params: any[] = [];
  const filters: string[] = [];
  for (const [key, column] of [["trip_id", "tr.trip_id"], ["user_id", "tr.user_id"]]) {
    if (req.query[key]) { params.push(positiveId(req.query[key])); filters.push(`${column} = $${params.length}`); }
  }
  if (req.query.search) { params.push(`%${String(req.query.search).slice(0, 100)}%`); filters.push(`(u.name ILIKE $${params.length} OR to_char(tp.trip_date, 'DD/MM/YYYY') ILIKE $${params.length})`); }
  res.json((await pool.query(reservationSelect + (filters.length ? ` WHERE ${filters.join(" AND ")}` : "") + " ORDER BY tp.trip_date, u.name", params)).rows);
}

async function saveReservation(req: Request, res: Response, editing: boolean) {
  const userId = positiveId(req.body.user_id), tripId = positiveId(req.body.trip_id);
  const id = editing ? positiveId(req.params.id) : null;
  const registered = isoDate(req.body.register_date);
  const due = req.body.due_date ? isoDate(req.body.due_date) : null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const trip = await client.query("SELECT cost, status, trip_date FROM temple_trips WHERE id = $1 FOR UPDATE", [tripId]);
    if (!trip.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Viaje no encontrado" }); }
    if (!editing && trip.rows[0].status !== "programado") throw new InputError("El viaje no está disponible");
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [userId, tripId]);
    let paidInstallments = 0;
    if (editing) {
      const current = await client.query("SELECT * FROM temple_attendance WHERE id = $1 FOR UPDATE", [id]);
      if (!current.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Reserva no encontrada" }); }
      const payments = await client.query("SELECT COALESCE(SUM(payment_amount),0) AS total, COUNT(*)::int AS count FROM temple_amortizations WHERE attendance_id = $1", [id]);
      paidInstallments = Number(payments.rows[0].total);
      if (payments.rows[0].count > 0 && (Number(current.rows[0].user_id) !== userId || Number(current.rows[0].trip_id) !== tripId)) throw new InputError("Una reserva con pagos no puede cambiar de miembro o viaje");
    }
    const duplicate = await client.query("SELECT id FROM temple_attendance WHERE user_id = $1 AND trip_id = $2 AND ($3::int IS NULL OR id <> $3)", [userId, tripId, id]);
    if (duplicate.rowCount) throw new InputError("El miembro ya tiene una reserva para ese viaje");
    const balance = reservationBalance(trip.rows[0].cost, req.body.initial_payment ?? req.body.advance_payment ?? 0, paidInstallments);
    const values = [userId, tripId, registered, balance.advance, balance.pending, due];
    const result = editing
      ? await client.query(`UPDATE temple_attendance SET user_id=$1, trip_id=$2, register_date=$3, advance_payment=$4, pending_payment=$5, due_date=$6 WHERE id=$7 RETURNING *`, [...values, id])
      : await client.query(`INSERT INTO temple_attendance (user_id,trip_id,register_date,advance_payment,pending_payment,due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, values);
    await client.query("COMMIT");
    res.status(editing ? 200 : 201).json(result.rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export const createReservation = (req: Request, res: Response) => saveReservation(req, res, false);
export const updateReservation = (req: Request, res: Response) => saveReservation(req, res, true);
export async function deleteReservation(req: Request, res: Response) {
  const id = positiveId(req.params.id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const record = await client.query("SELECT id FROM temple_attendance WHERE id = $1 FOR UPDATE", [id]);
    if (!record.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Reserva no encontrada" }); }
    const payments = await client.query("SELECT id FROM temple_amortizations WHERE attendance_id = $1 LIMIT 1", [id]);
    if (payments.rowCount) throw new InputError("Elimina o revierte los pagos antes de eliminar la reserva");
    await client.query("DELETE FROM temple_attendance WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Reserva eliminada" });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
