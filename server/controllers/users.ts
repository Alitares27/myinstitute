import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../models/db";
import { AuthRequest } from "../middleware/auth";

function generateToken(id: number, role: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");
  return jwt.sign({ id, role }, secret, { expiresIn: "1h" });
}

export async function registerUser(req: Request, res: Response) {
  try {
    const { name, email, password, telefono, role, specialty } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Campos requeridos faltantes" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      "INSERT INTO users (name, email, password, telefono, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, telefono, role",
      [name, email, hash, telefono, role]
    );

    const user = userResult.rows[0];

    if (role === "student") {
      await pool.query("INSERT INTO students (user_id) VALUES ($1)", [user.id]);
    } else if (role === "teacher") {
      await pool.query("INSERT INTO teachers (user_id, specialty) VALUES ($1, $2)", [
        user.id,
        specialty || "General",
      ]);
    }

    const token = generateToken(user.id, user.role);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Error al registrar usuario" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken(user.id, user.role);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      telefono: user.telefono,
      role: user.role,
    };

    res.json({ token, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      "SELECT id, name, email, telefono, role FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener perfil" });
  }
}