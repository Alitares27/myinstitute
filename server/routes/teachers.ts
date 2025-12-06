import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.specialty, t.created_at, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ message: "Error fetching teachers" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, specialty } = req.body;

    if (!user_id || !specialty) {
      return res.status(400).json({ message: "user_id y specialty son requeridos" });
    }

    const result = await pool.query(
      "INSERT INTO teachers (user_id, specialty) VALUES ($1, $2) RETURNING *",
      [user_id, specialty]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating teacher:", err);
    res.status(500).json({ message: "Error creating teacher" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { specialty } = req.body;
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE teachers SET specialty = $1 WHERE id = $2 RETURNING *",
      [specialty, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating teacher:", err);
    res.status(500).json({ message: "Error updating teacher" });
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query("DELETE FROM teachers WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error("Error deleting teacher:", err);
    res.status(500).json({ message: "Error deleting teacher" });
  }
});

export default router;