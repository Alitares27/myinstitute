import express, { Response } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    let query = `
      SELECT 
        t.id, 
        t.specialty, 
        t.created_at, 
        u.id AS user_id, 
        u.name, 
        u.email, 
        u.telefono, 
        u.role,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'title', c.title, 'description', c.description)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS courses
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN courses c ON c.teacher_id = t.id
    `;
    let values: any[] = [];

    if (role === "student") {
      query += `
        WHERE t.id IN (
          SELECT c2.teacher_id FROM courses c2
          JOIN enrollments e ON e.course_id = c2.id
          JOIN students s ON s.id = e.student_id
          WHERE s.user_id = $1
        )
      `;
      values.push(userId);
    } else if (role === "teacher") {
      query += ` WHERE t.user_id = $1 `;
      values.push(userId);
    }

    query += `
      GROUP BY t.id, t.specialty, t.created_at, u.id, u.name, u.email, u.telefono, u.role
      ORDER BY u.name ASC
    `;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ message: "Error fetching teachers" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { user_id, specialty, course_ids } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "El miembro es requerido" });
    }

    await client.query("BEGIN");

    const userRes = await client.query("SELECT id, name, email, role FROM users WHERE id = $1", [user_id]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Miembro no encontrado" });
    }

    const existingTeacher = await client.query("SELECT id FROM teachers WHERE user_id = $1", [user_id]);
    let teacherId: number;

    if (existingTeacher.rows.length > 0) {
      teacherId = existingTeacher.rows[0].id;
      await client.query(
        "UPDATE teachers SET specialty = $1 WHERE id = $2",
        [specialty || "General", teacherId]
      );
    } else {
      const insertRes = await client.query(
        "INSERT INTO teachers (user_id, specialty) VALUES ($1, $2) RETURNING id",
        [user_id, specialty || "General"]
      );
      teacherId = insertRes.rows[0].id;
    }

    if (userRes.rows[0].role === "student") {
      await client.query("UPDATE users SET role = 'teacher' WHERE id = $1", [user_id]);
    }

    if (Array.isArray(course_ids)) {
      await client.query("UPDATE courses SET teacher_id = NULL WHERE teacher_id = $1", [teacherId]);
      if (course_ids.length > 0) {
        await client.query("UPDATE courses SET teacher_id = $1 WHERE id = ANY($2::int[])", [teacherId, course_ids]);
      }
    }

    await client.query("COMMIT");

    const completeRes = await pool.query(`
      SELECT 
        t.id, 
        t.specialty, 
        t.created_at, 
        u.id AS user_id, 
        u.name, 
        u.email, 
        u.telefono, 
        u.role,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'title', c.title, 'description', c.description)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS courses
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN courses c ON c.teacher_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, t.specialty, t.created_at, u.id, u.name, u.email, u.telefono, u.role
    `, [teacherId]);

    res.status(201).json(completeRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating teacher:", err);
    res.status(500).json({ message: "Error al registrar maestro" });
  } finally {
    client.release();
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { specialty, course_ids } = req.body;
    const { id } = req.params;

    await client.query("BEGIN");

    const updateRes = await client.query(
      "UPDATE teachers SET specialty = $1 WHERE id = $2 RETURNING *",
      [specialty || "General", id]
    );

    if (updateRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Maestro no encontrado" });
    }

    if (Array.isArray(course_ids)) {
      await client.query("UPDATE courses SET teacher_id = NULL WHERE teacher_id = $1", [id]);
      if (course_ids.length > 0) {
        await client.query("UPDATE courses SET teacher_id = $1 WHERE id = ANY($2::int[])", [id, course_ids]);
      }
    }

    await client.query("COMMIT");

    const completeRes = await pool.query(`
      SELECT 
        t.id, 
        t.specialty, 
        t.created_at, 
        u.id AS user_id, 
        u.name, 
        u.email, 
        u.telefono, 
        u.role,
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'title', c.title, 'description', c.description)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS courses
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN courses c ON c.teacher_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, t.specialty, t.created_at, u.id, u.name, u.email, u.telefono, u.role
    `, [id]);

    res.json(completeRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating teacher:", err);
    res.status(500).json({ message: "Error al actualizar maestro" });
  } finally {
    client.release();
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    await client.query("UPDATE courses SET teacher_id = NULL WHERE teacher_id = $1", [id]);

    const result = await client.query("DELETE FROM teachers WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Maestro no encontrado" });
    }

    await client.query("COMMIT");
    res.json({ message: "Maestro eliminado correctamente" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Error deleting teacher:", err);
    res.status(500).json({ message: "Error al eliminar maestro" });
  } finally {
    client.release();
  }
});

export default router;