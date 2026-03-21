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
    res.status(500).json({ message: "Error al obtener estudiantes" });
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const { name, grade } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentRes = await client.query(
      "UPDATE students SET grade = $1 WHERE id = $2 RETURNING user_id",
      [grade, id]
    );

    if (studentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Estudiante no encontrado" });
    }

    const userId = studentRes.rows[0].user_id;

    await client.query("UPDATE users SET name = $1 WHERE id = $2", [name, userId]);

    const updated = await client.query(`
      SELECT s.id, s.grade, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [id]
    );

    await client.query("COMMIT");
    client.release();

    res.json(updated.rows[0]);
  } catch (err: any) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ Error updating student:", err);
    res.status(500).json({ message: "Error al actualizar" });
  }
});


router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM students WHERE id = $1", [id]);
    res.json({ message: "Estudiante eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar" });
  }
});

export default router;