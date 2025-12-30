import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

export type UserRole = "admin" | "student" | "teacher";

export interface AuthPayload extends JwtPayload {
  id: number;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
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