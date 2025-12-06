import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.grade, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching students" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, grade } = req.body;
    const result = await pool.query(
      "INSERT INTO students (user_id, grade) VALUES ($1, $2) RETURNING *",
      [user_id, grade]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating student" });
  }
});

export default router;