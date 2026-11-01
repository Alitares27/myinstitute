import { readPage, addFilters, addSearch } from "../utils/pagination";
import { businessDate } from "../utils/businessDate";
import { cents, isoDate, positiveId } from "../utils/validation";
import { asyncRouter } from "../middleware/asyncRouter";
import { Router, Request, Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

function paymentQuery(req: AuthRequest) {
  const params: any[] = [];
  const filters = addFilters(req, params, { member_id: "ta.user_id", temple_id: "tt.temple_id", trip_id: "ta.trip_id" });
  filters.push(...addSearch(req, params, ["u.name"]));
  const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
  const reservations = `SELECT ta.id,ta.advance_payment,ta.pending_payment FROM temple_attendance ta JOIN users u ON u.id=ta.user_id JOIN temple_trips tt ON tt.id=ta.trip_id${where}`;
  const paymentWhere = [...filters];
  if (req.query.payment_type) { params.push(String(req.query.payment_type)); paymentWhere.push(`tam.payment_type=$${params.length}`); }
  const select = `SELECT tam.id,tam.attendance_id,u.name AS miembro_nombre,tam.payment_amount,tam.payment_date,tam.payment_type,
    ta.advance_payment AS monto_pagado_actual,ta.pending_payment AS monto_adeudado
    FROM temple_amortizations tam JOIN temple_attendance ta ON ta.id=tam.attendance_id JOIN users u ON u.id=ta.user_id JOIN temple_trips tt ON tt.id=ta.trip_id
    ${paymentWhere.length ? `WHERE ${paymentWhere.join(" AND ")}` : ""}`;
  const summary = `jsonb_build_object('totalPagado',COALESCE(SUM(payment_amount),0),'totalAdeudado',(SELECT COALESCE(SUM(pending_payment),0) FROM (${reservations}) debts),
    'totalSaldados',(SELECT COUNT(*) FROM (${reservations}) settled WHERE pending_payment=0),
    'efectivo',COALESCE(SUM(payment_amount) FILTER(WHERE payment_type='efectivo'),0),'transferencia',COALESCE(SUM(payment_amount) FILTER(WHERE payment_type='transferencia'),0),'donacion',COALESCE(SUM(payment_amount) FILTER(WHERE payment_type='donacion'),0))`;
  return { select, params, summary };
}
router.get("/report", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const { select, params, summary } = paymentQuery(req);
  const result = await pool.query(`WITH filtered AS (${select}) SELECT COALESCE(json_agg(filtered),'[]'::json) AS items,${summary} AS summary FROM filtered`, params);
  res.json(result.rows[0]);
});
router.get("/events", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  res.json(await readPage(req, `SELECT e.*,u.name AS actor_name FROM financial_events e LEFT JOIN users u ON u.id=e.actor_id`, [], { created_at: "created_at" }, "created_at"));
});
router.get("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const { select, params, summary } = paymentQuery(req);
  res.json(await readPage(req, select, params, { miembro_nombre: "miembro_nombre", payment_amount: "payment_amount", monto_adeudado: "monto_adeudado", payment_date: "payment_date", payment_type: "payment_type" }, "payment_date", summary));
});

router.post(
  "/",
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { attendance_id, payment_amount, payment_date, payment_type } = req.body;

      positiveId(attendance_id);
      if (payment_date) isoDate(payment_date);
      if (payment_type && !["efectivo", "transferencia", "donacion"].includes(payment_type)) return res.status(400).json({ message: "Medio de pago inválido" });
      if (!attendance_id) {
        return res.status(400).json({ message: "attendance_id es requerido" });
      }

      const amount = cents(payment_amount, false) / 100;
      if (Number.isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "payment_amount debe ser un número positivo" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const attendanceResult = await client.query(
          "SELECT advance_payment, pending_payment FROM temple_attendance WHERE id = $1 FOR UPDATE",
          [attendance_id]
        );

        if (attendanceResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Asistencia no encontrada" });
        }

        const currentAttendance = attendanceResult.rows[0];
        const currentPending = Number(currentAttendance.pending_payment || 0);

        if (amount > currentPending) {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "El pago no puede ser mayor al saldo pendiente" });
        }

        const newAdvance = (cents(currentAttendance.advance_payment || 0) + cents(amount)) / 100;
        const newPending = (cents(currentPending) - cents(amount)) / 100;

        const amortizationResult = await client.query(
          `INSERT INTO temple_amortizations (attendance_id, payment_amount, payment_date, payment_type)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [attendance_id, amount, payment_date || businessDate(), payment_type || "efectivo"]
        );

        await client.query(
          `UPDATE temple_attendance
            SET advance_payment = $1,
                pending_payment = $2
            WHERE id = $3`,
          [newAdvance, newPending, attendance_id]
        );

        await client.query("INSERT INTO financial_events(actor_id,event_type,reservation_id,payment_id,details) VALUES($1,'payment_created',$2,$3,$4::jsonb)",
          [req.user!.id, attendance_id, amortizationResult.rows[0].id, JSON.stringify({ amount, payment_date, payment_type })]);
        await client.query("COMMIT");

        res.status(201).json({
          amortization: amortizationResult.rows[0],
          updatedAttendance: {
            id: attendance_id,
            advance_payment: newAdvance,
            pending_payment: newPending
          }
        });
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch { }
        console.error("Error crear amortización:", err);
        res.status(500).json({ message: "Error al registrar el pago" });
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (err.status === 400) return res.status(400).json({ message: err.message });
      console.error("Error en endpoint:", err);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { payment_amount, payment_date, payment_type } = req.body;

    positiveId(id);
    if (payment_date) isoDate(payment_date);
    if (payment_type && !["efectivo", "transferencia", "donacion"].includes(payment_type)) return res.status(400).json({ message: "Medio de pago inválido" });
    const amount = cents(payment_amount, false) / 100;
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "payment_amount debe ser un número positivo" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const amortResult = await client.query(
        "SELECT attendance_id, payment_amount FROM temple_amortizations WHERE id = $1",
        [id]
      );
      if (amortResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Pago no encontrado" });
      }

      let oldAmount = Number(amortResult.rows[0].payment_amount);
      const attendanceId = amortResult.rows[0].attendance_id;

      const attendanceResult = await client.query(
        "SELECT advance_payment, pending_payment FROM temple_attendance WHERE id = $1 FOR UPDATE",
        [attendanceId]
      );
      if (attendanceResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      const lockedPayment = await client.query("SELECT payment_amount FROM temple_amortizations WHERE id=$1 FOR UPDATE", [id]);
      if (!lockedPayment.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Pago no encontrado" }); }
      oldAmount = Number(lockedPayment.rows[0].payment_amount);
      const currentAdvance = Number(attendanceResult.rows[0].advance_payment || 0);
      const currentPending = Number(attendanceResult.rows[0].pending_payment || 0);

      const newAdvance = (cents(currentAdvance) - cents(oldAmount) + cents(amount)) / 100;
      const newPending = (cents(currentPending) + cents(oldAmount) - cents(amount)) / 100;

      if (newPending < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "El monto excede el saldo total del miembro" });
      }
      if (newAdvance < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "El monto no puede ser menor que cero" });
      }

      const updatedAmort = await client.query(
        `UPDATE temple_amortizations
            SET payment_amount = $1,
                payment_date   = $2,
                payment_type   = $3
          WHERE id = $4
          RETURNING *`,
        [amount, payment_date || businessDate(), payment_type || "efectivo", id]
      );

      await client.query(
        `UPDATE temple_attendance
            SET advance_payment = $1,
                pending_payment = $2
          WHERE id = $3`,
        [newAdvance, newPending, attendanceId]
      );

      await client.query("INSERT INTO financial_events(actor_id,event_type,reservation_id,payment_id,details) VALUES($1,'payment_updated',$2,$3,$4::jsonb)",
        [req.user!.id, attendanceId, Number(id), JSON.stringify({ old_amount: oldAmount, new_amount: amount, payment_date, payment_type })]);
      await client.query("COMMIT");

      res.json({
        amortization: updatedAmort.rows[0],
        updatedAttendance: { advance_payment: newAdvance, pending_payment: newPending }
      });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch { }
      console.error("Error editar amortización:", err);
      res.status(500).json({ message: "Error al editar el pago" });
    } finally {
      client.release();
    }
  }
);

router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const amortResult = await client.query(
        "SELECT attendance_id, payment_amount FROM temple_amortizations WHERE id = $1",
        [id]
      );
      if (amortResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Pago no encontrado" });
      }

      let oldAmount = Number(amortResult.rows[0].payment_amount);
      const attendanceId = amortResult.rows[0].attendance_id;

      const attendanceResult = await client.query(
        "SELECT advance_payment, pending_payment FROM temple_attendance WHERE id = $1 FOR UPDATE",
        [attendanceId]
      );
      if (attendanceResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Asistencia no encontrada" });
      }

      const lockedPayment = await client.query("SELECT payment_amount FROM temple_amortizations WHERE id=$1 FOR UPDATE", [id]);
      if (!lockedPayment.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Pago no encontrado" }); }
      oldAmount = Number(lockedPayment.rows[0].payment_amount);
      const currentAdvance = Number(attendanceResult.rows[0].advance_payment || 0);
      const currentPending = Number(attendanceResult.rows[0].pending_payment || 0);

      const newAdvance = (cents(currentAdvance) - cents(oldAmount)) / 100;
      const newPending = (cents(currentPending) + cents(oldAmount)) / 100;
      if (newAdvance < 0) { await client.query("ROLLBACK"); return res.status(409).json({ message: "El saldo histórico requiere conciliación antes de eliminar este pago" }); }

      await client.query("INSERT INTO financial_events(actor_id,event_type,reservation_id,payment_id,details) SELECT $1,'payment_reversed',attendance_id,id,to_jsonb(temple_amortizations) FROM temple_amortizations WHERE id=$2", [req.user!.id, id]);
      await client.query("DELETE FROM temple_amortizations WHERE id = $1", [id]);

      await client.query(
        `UPDATE temple_attendance
            SET advance_payment = $1,
                pending_payment = $2
          WHERE id = $3`,
        [newAdvance, newPending, attendanceId]
      );

      await client.query("COMMIT");

      res.json({ message: "Pago eliminado correctamente", id: Number(id) });
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch { }
      console.error("Error eliminar amortización:", err);
      res.status(500).json({ message: "Error al eliminar el pago" });
    } finally {
      client.release();
    }
  }
);

export default router;
