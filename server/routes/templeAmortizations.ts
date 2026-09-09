import { Router, Request, Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  verifyToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { member_id, temple_id, trip_id } = req.query;
      const where: string[] = [];
      const params: any[] = [];

      if (member_id) {
        where.push(`ta.user_id = $${params.length + 1}`);
        params.push(member_id as string);
      }
      if (trip_id) {
        where.push(`ta.trip_id = $${params.length + 1}`);
        params.push(trip_id as string);
      }
      if (temple_id) {
        where.push(`tt.temple_id = $${params.length + 1}`);
        params.push(temple_id as string);
      }

      const query = `
        SELECT 
          tam.id,
          u.name AS miembro_nombre,
          tam.payment_amount,
          tam.payment_date,
          tam.payment_type,
          ta.advance_payment AS monto_pagado_actual,
          ta.pending_payment AS monto_adeudado
        FROM temple_amortizations tam
        JOIN temple_attendance ta ON tam.attendance_id = ta.id
        JOIN users u ON ta.user_id = u.id
        LEFT JOIN temple_trips tt ON ta.trip_id = tt.id
        ${where.length > 0 ? "WHERE " + where.join(" AND ") : ""}
        ORDER BY tam.payment_date DESC
      `;

      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error("Error fetching amortizations:", err);
      res.status(500).json({ message: "Error al cargar los pagos" });
    }
  }
);

router.post(
  "/",
  verifyToken,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { attendance_id, payment_amount, payment_date, payment_type } = req.body;

      if (!attendance_id) {
        return res.status(400).json({ message: "attendance_id es requerido" });
      }

      const amount = Number(payment_amount);
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

        const newAdvance = Number(currentAttendance.advance_payment || 0) + amount;
        const newPending = Math.max(0, currentPending - amount);

        const amortizationResult = await pool.query(
          `INSERT INTO temple_amortizations (attendance_id, payment_amount, payment_date, payment_type)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [attendance_id, amount, payment_date || new Date().toISOString().split("T")[0], payment_type || "efectivo"]
        );

        await pool.query(
          `UPDATE temple_attendance
            SET advance_payment = $1,
                pending_payment = $2
            WHERE id = $3`,
          [newAdvance, newPending, attendance_id]
        );

        await pool.query("COMMIT");

        res.status(201).json({
          amortization: amortizationResult.rows[0],
          updatedAttendance: {
            id: attendance_id,
            advance_payment: newAdvance,
            pending_payment: newPending
          }
        });
      } catch (err) {
        try { await pool.query("ROLLBACK"); } catch {}
        console.error("Error crear amortización:", err);
        res.status(500).json({ message: "Error al registrar el pago" });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Error en endpoint:", err);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
);

export default router;