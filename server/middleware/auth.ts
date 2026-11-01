import { createHmac } from "crypto";
import { pool } from "../models/db";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

export type UserRole = "admin" | "student" | "teacher";

export interface AuthPayload extends JwtPayload {
  id: number;
  role: UserRole;
  version: number;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, secret) as AuthPayload;
    if (!Number.isSafeInteger(decoded.version) || !Number.isSafeInteger(decoded.id) || !["admin", "teacher", "student"].includes(decoded.role)) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const result = await pool.query("SELECT role, password, auth_version FROM users WHERE id = $1", [decoded.id]);
    const current = result.rows[0];
    if (!current || Number(current.auth_version) !== decoded.version || current.role !== decoded.role || decoded.session !== sessionFingerprint(current.password)) {
      return res.status(401).json({ message: "La sesión expiró. Inicia sesión nuevamente." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({ message: "Token expired, please login again" });
    }
    if (err instanceof JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Internal authentication error" });
  }
}

function hasRole(role: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: `${role}s only` });
    }

    next();
  };
}

export const isAdmin = hasRole("admin");
export const isStudent = hasRole("student");
export const isTeacher = hasRole("teacher");
export function sessionFingerprint(passwordHash: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return createHmac("sha256", secret).update(passwordHash).digest("hex");
}
export const canTeach = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin" && req.user?.role !== "teacher") return res.status(403).json({ message: "Solo administradores y docentes" });
  next();
};
