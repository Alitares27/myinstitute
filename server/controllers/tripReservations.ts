import { pageOptions } from "../utils/pagination";
import { Request, Response } from "express";
import { pool } from "../models/db";
import { positiveId, isoDate, reservationBalance, InputError } from "../utils/validation";

const reservationBase = `SELECT tr.*,u.name AS user_name,u.document AS user_document,tp.trip_date,tp.cost,t.name AS temple_name
  FROM temple_attendance tr JOIN users u ON u.id=tr.user_id JOIN temple_trips tp ON tp.id=tr.trip_id JOIN temples t ON t.id=tp.temple_id`;
const reservationSelect = `${reservationBase.replace("SELECT tr.*", "SELECT pay.total_amortizado,pay.num_pagos,tr.*")}
  LEFT JOIN LATERAL (SELECT COALESCE(SUM(payment_amount),0) AS total_amortizado,COUNT(*)::int AS num_pagos FROM temple_amortizations WHERE attendance_id=tr.id) pay ON true`;

export async function getReservations(req: Request, res: Response) {

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
  const {page,limit,order,direction}=pageOptions(req,sorts,"id");
  const needsPayments=["adelanto","abonos"].includes(String(req.query.sort));
  const base=(needsPayments?reservationSelect:reservationBase)+where;
  const result=await pool.query(`WITH filtered AS NOT MATERIALIZED (${base}),page_rows AS (
      SELECT * FROM filtered ORDER BY ${order} ${direction},id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}
    ) SELECT (SELECT COALESCE(json_agg(item),'[]'::json) FROM (
      SELECT page_rows.*${needsPayments?"":",pay.total_amortizado,pay.num_pagos"}
      FROM page_rows ${needsPayments?"":"LEFT JOIN LATERAL (SELECT COALESCE(SUM(payment_amount),0) AS total_amortizado,COUNT(*)::int AS num_pagos FROM temple_amortizations WHERE attendance_id=page_rows.id) pay ON true"}
      ORDER BY ${order} ${direction},page_rows.id DESC
    ) item) AS items,COUNT(*)::int AS total,COALESCE(SUM(advance_payment),0) AS total_paid,COALESCE(SUM(pending_payment),0) AS total_pending FROM filtered`,[...params,limit,(page-1)*limit]);
  res.json({ ...result.rows[0], summary:{totalPaid:Number(result.rows[0].total_paid),totalPending:Number(result.rows[0].total_pending)}, page, limit });
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
    const trip = await client.query("SELECT tt.cost, tt.status, tt.trip_date, tt.archived_at, t.archived_at AS temple_archived_at FROM temple_trips tt JOIN temples t ON t.id=tt.temple_id WHERE tt.id=$1 FOR SHARE OF t,tt", [tripId]);
    if (!trip.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Viaje no encontrado" }); }
    if (!editing && (trip.rows[0].status !== "programado" || trip.rows[0].archived_at || trip.rows[0].temple_archived_at)) throw new InputError("El viaje no está disponible");
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [userId, tripId]);
    let paidInstallments = 0;
    let previous: any = null;
    if (editing) {
      const current = await client.query("SELECT * FROM temple_attendance WHERE id = $1 FOR UPDATE", [id]);
      if (!current.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Reserva no encontrada" }); }
      previous = current.rows[0];
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
    if (balance.advance !== 0 || Number(previous?.advance_payment || 0) !== 0 || paidInstallments !== 0) {
      await client.query("INSERT INTO financial_events(actor_id,event_type,reservation_id,details) VALUES($1,$2,$3,$4::jsonb)",
        [(req as any).user.id,editing?"reservation_updated":"reservation_created",result.rows[0].id,JSON.stringify({before:previous,after:result.rows[0],initial_payment:req.body.initial_payment ?? req.body.advance_payment ?? 0})]);
    }
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
    const record = await client.query("SELECT id,advance_payment FROM temple_attendance WHERE id = $1 FOR UPDATE", [id]);
    if (!record.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Reserva no encontrada" }); }
    const payments = await client.query("SELECT id FROM temple_amortizations WHERE attendance_id = $1 LIMIT 1", [id]);
    const history=await client.query("SELECT id FROM financial_events WHERE reservation_id=$1 LIMIT 1",[id]);
    if (payments.rowCount || history.rowCount || Number(record.rows[0].advance_payment || 0) !== 0) throw new InputError("Elimina o revierte los pagos antes de eliminar la reserva");
    await client.query("DELETE FROM temple_attendance WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Reserva eliminada" });
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
