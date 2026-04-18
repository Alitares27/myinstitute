import { Request, Response } from "express";
import { pool } from "../models/db";

export const getReservations = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        tr.id,
        tr.user_id,
        u.name AS user_name,
        tr.trip_id,
        t.name AS temple_name,
        tp.trip_date,
        tp.cost,
        tr.register_date,
        tr.advance_payment,
        tr.pending_payment,
        tr.due_date
      FROM temple_attendance tr
      LEFT JOIN users u ON u.id = tr.user_id
      LEFT JOIN temple_trips tp ON tp.id = tr.trip_id
      LEFT JOIN temples t ON t.id = tp.temple_id
      ORDER BY tr.id DESC;
    `);

    res.json(Array.isArray(result.rows) ? result.rows : []);
  } catch (error) {
    console.error("Error en getReservations:", error);
    res.status(500).json([]);
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const { user_id, trip_id, register_date, advance_payment, due_date } = req.body;

    const tripResult = await pool.query(
      "SELECT cost FROM temple_trips WHERE id = $1",
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    const cost = Number(tripResult.rows[0].cost);
    const advance = Number(advance_payment || 0);
    const pending = cost - advance;

    const result = await pool.query(
      `INSERT INTO temple_attendance 
        (user_id, trip_id, register_date, advance_payment, pending_payment, due_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [user_id, trip_id, register_date, advance, pending, due_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error crear reserva:", error);
    res.status(500).json({ message: "Error al crear reserva" });
  }
};

export const updateReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      user_id,
      trip_id,
      register_date,
      advance_payment,
      due_date
    } = req.body;

    const tripResult = await pool.query(
      "SELECT cost FROM temple_trips WHERE id = $1",
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ message: "Viaje no encontrado" });
    }

    const cost = Number(tripResult.rows[0].cost);
    const advance = Number(advance_payment || 0);
    const pending = cost - advance;

    const result = await pool.query(
      `UPDATE temple_attendance SET
        user_id = $1,
        trip_id = $2,
        register_date = $3,
        advance_payment = $4,
        pending_payment = $5,
        due_date = $6
       WHERE id = $7
       RETURNING *`,
      [user_id, trip_id, register_date, advance, pending, due_date, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar reserva" });
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM temple_attendance WHERE id = $1",
      [id]
    );

    res.json({ message: "Reserva eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar reserva" });
  }
};
