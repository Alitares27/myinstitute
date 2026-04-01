import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    let query = `
      SELECT DISTINCT s.id, s.grade, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM students s
      JOIN users u ON s.user_id = u.id
    `;
    let values: any[] = [];

    if (role === "teacher") {
      query += `
        JOIN enrollments e ON e.student_id = s.id
        JOIN courses c ON c.id = e.course_id
        JOIN teachers t ON t.id = c.teacher_id
        WHERE t.user_id = $1
      `;
      values.push(userId);
    } else if (role === "student") {
      query += ` WHERE s.user_id = $1 `;
      values.push(userId);
    }

    query += ` ORDER BY u.name ASC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener estudiantes" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const { user_id, grade } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query("SELECT id, role FROM users WHERE id = $1", [user_id]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const existing = await client.query("SELECT id FROM students WHERE user_id = $1", [user_id]);
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ message: "Este usuario ya está registrado como estudiante" });
    }

    await client.query("INSERT INTO students (user_id, grade) VALUES ($1, $2)", [user_id, grade]);

    if (userRes.rows[0].role !== "student") {
      await client.query("UPDATE users SET role = 'student' WHERE id = $1", [user_id]);
    }

    const completeRes = await client.query(`
      SELECT s.id, s.grade, u.id AS user_id, u.name, u.email, u.telefono, u.role
      FROM students s JOIN users u ON s.user_id = u.id WHERE s.user_id = $1`, [user_id]
    );

    await client.query("COMMIT");
    client.release();
    res.status(201).json(completeRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ Error adding student:", err);
    res.status(500).json({ message: "Error al añadir estudiante" });
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