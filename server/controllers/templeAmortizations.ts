import { Request, Response } from "express";
import { pool } from "../models/db";

export const createTempleAmortization = async (req: Request, res: Response) => {
  try {
    const { attendance_id, payment_amount, payment_date } = req.body;

    if (!attendance_id) {
      return res.status(400).json({ message: "attendance_id is required" });
    }

    const amount = Number(payment_amount);
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "payment_amount must be a positive number" });
    }

    const attendanceResult = await pool.query(
      "SELECT advance_payment, pending_payment FROM temple_attendance WHERE id = $1",
      [attendance_id]
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }

    const currentAttendance = attendanceResult.rows[0];
    const currentPending = Number(currentAttendance.pending_payment || 0);

    if (amount > currentPending) {
      return res.status(400).json({ message: "El pago no puede ser mayor al saldo pendiente" });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const amortizationResult = await client.query(
        `INSERT INTO temple_amortizations (attendance_id, payment_amount, payment_date)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [attendance_id, amount, payment_date || new Date().toISOString().split("T")[0]]
      );

      const newAdvance = Number(currentAttendance.advance_payment || 0) + amount;
      const newPending = Math.max(0, currentPending - amount);

      await client.query(
        `UPDATE temple_attendance
         SET advance_payment = $1,
             pending_payment = $2
         WHERE id = $3`,
        [newAdvance, newPending, attendance_id]
      );

      await client.query("COMMIT");

      res.status(201).json({
        amortization: amortizationResult.rows[0],
        updatedAttendance: {
          id: attendance_id,
          advance_payment: newAdvance,
          pending_payment: newPending
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error crear amortización:", error);
    res.status(500).json({ message: "Error al registrar el pago" });
  }
};
