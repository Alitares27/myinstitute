import type { Module } from "../utils/roles";
import { createHmac } from "crypto";
import { pool } from "../models/db";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

export type UserRole = "admin" | "student" | "teacher";

export interface AuthPayload extends JwtPayload {
  id: number;
  role: UserRole;
  tokenVersion: number;
  permissions?: Module[];
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
    if (!Number.isSafeInteger(decoded.tokenVersion) || !Number.isSafeInteger(decoded.id) || !["admin", "teacher", "student"].includes(decoded.role)) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const result = await pool.query("SELECT role, password, token_version, permissions FROM users WHERE id = $1", [decoded.id]);
    const current = result.rows[0];
    if (!current || Number(current.token_version) !== decoded.tokenVersion || current.role !== decoded.role || decoded.session !== sessionFingerprint(current.password)) {
      return res.status(401).json({ message: "La sesiÃ³n expirÃ³. Inicia sesiÃ³n nuevamente." });
    }
    req.user = { ...decoded, permissions: current.permissions ?? [] };
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

export function requireModuleAccess(...modules: Module[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    res.locals.securityModule = modules.join(",");
    if (req.user?.role === "admin" || req.user?.role === "student" ||
        (req.user?.role === "teacher" && modules.some(module => req.user?.permissions?.includes(module)))) {
      return next();
    }
    return res.status(403).json({ message: "No tienes permiso para acceder a este módulo." });
  };
}

export function adminOrTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role === "admin" || req.user?.role === "teacher") return next();
  return res.status(403).json({ message: "No tienes permiso para esta operaciÃ³n." });
}
