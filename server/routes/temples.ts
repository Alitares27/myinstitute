import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, city, province, status
       FROM temples
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching temples:", err);
    res.status(500).json({ message: "Error al obtener los templos" });
  }
});

export default router;
