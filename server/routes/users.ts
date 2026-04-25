import express, { Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../models/db";
import { registerUser, loginUser } from "../controllers/users";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, telefono, role, document FROM users WHERE id = $1",
      [req.user?.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Error obteniendo usuario" });
  }
});

router.get("/", verifyToken, isAdmin, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.telefono, u.role, u.document, t.specialty, s.grade
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN students s ON u.id = s.user_id
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.post("/", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, email, password, telefono, role, specialty, grade, document } = req.body;
    await client.query("BEGIN");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRes = await client.query(
      "INSERT INTO users (name, email, password, telefono, role, document) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, telefono, role, document",
      [name, email, hashedPassword, telefono, role, document || null]
    );
    const newUser = userRes.rows[0];

    if (role === "teacher") {
      await client.query("INSERT INTO teachers (user_id, specialty) VALUES ($1, $2)", [newUser.id, specialty]);
    } else if (role === "student") {
      await client.query("INSERT INTO students (user_id, grade) VALUES ($1, $2)", [newUser.id, grade]);
    }

    await client.query("COMMIT");
    res.status(201).json({ user: { ...newUser, specialty, grade } });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.code === "23505" ? "Email o documento duplicado" : "Error al crear" });
  } finally {
    client.release();
  }
});

router.put("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, email, telefono, role, password, specialty, grade, document } = req.body;
    await client.query("BEGIN");

    const setClauses = ["name=$1", "email=$2", "telefono=$3", "role=$4", "document=$5"];
    const params: any[] = [name, email, telefono, role, document || null];

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      params.push(await bcrypt.hash(password, salt));
      setClauses.push(`password=$${params.length}`);
    }

    params.push(id);
    const result = await client.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id=$${params.length} RETURNING id, name, email, telefono, role, document`,
      params
    );

    if (role === "teacher") {
      await client.query("INSERT INTO teachers (user_id, specialty) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET specialty = $2", [id, specialty]);
    } else if (role === "student") {
      await client.query("INSERT INTO students (user_id, grade) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET grade = $2", [id, grade]);
    }

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error actualizando usuario:", err);
    res.status(500).json({ message: "Error actualizando" });
  } finally {
    client.release();
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "Usuario eliminado" });
  } catch {
    res.status(500).json({ message: "Error eliminando" });
  }
});

export default router;