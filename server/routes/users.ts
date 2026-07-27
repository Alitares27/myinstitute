import express, { Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { pool } from "../models/db";
import { registerUser, loginUser } from "../controllers/users";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

router.get("/me", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, telefono, role, document FROM users WHERE id = $1",
      [req.user?.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Miembro no encontrado" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Error obteniendo miembro" });
  }
});

router.put("/me/password", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Se requieren ambas contraseñas" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
    }
    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user?.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Miembro no encontrado" });
    }
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) {
      return res.status(401).json({ message: "La contraseña actual es incorrecta" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user?.id]);
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch {
    res.status(500).json({ message: "Error actualizando contraseña" });
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

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Campos requeridos faltantes" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existingEmail = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }
    if (document) {
      const existingDoc = await client.query("SELECT id FROM users WHERE document = $1", [document]);
      if (existingDoc.rows.length > 0) {
        return res.status(400).json({ message: "El número de documento ya está registrado" });
      }
    }

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
    console.error("Error actualizando miembro:", err);
    res.status(500).json({ message: "Error actualizando" });
  } finally {
    client.release();
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");

    const userRes = await client.query("SELECT role FROM users WHERE id = $1", [id]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Miembro no encontrado" });
    }

    const role = userRes.rows[0].role;

    if (role === "student") {
      const studentRes = await client.query("SELECT id FROM students WHERE user_id = $1", [id]);
      if (studentRes.rows.length > 0) {
        const studentId = studentRes.rows[0].id;
        await client.query("DELETE FROM attendance WHERE student_id = $1", [studentId]);
        await client.query("DELETE FROM grades WHERE student_id = $1", [studentId]);
        await client.query("DELETE FROM enrollments WHERE student_id = $1", [studentId]);
        await client.query("DELETE FROM students WHERE id = $1", [studentId]);
      }
    } else if (role === "teacher") {
      const teacherRes = await client.query("SELECT id FROM teachers WHERE user_id = $1", [id]);
      if (teacherRes.rows.length > 0) {
        const teacherId = teacherRes.rows[0].id;
        await client.query("DELETE FROM courses WHERE teacher_id = $1", [teacherId]);
        await client.query("DELETE FROM teachers WHERE id = $1", [teacherId]);
      }
    }

    await client.query("DELETE FROM users WHERE id = $1", [id]);
    await client.query("COMMIT");
    res.json({ message: "Miembro eliminado" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Error eliminando" });
  } finally {
    client.release();
  }
});

export default router;