import { Router } from "express";
import { pool } from "../models/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM temas ORDER BY title ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener temas" });
  }
});

export default router;