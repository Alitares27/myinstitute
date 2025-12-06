import { Router } from "express";
import jwt from "jsonwebtoken";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = Router();


router.get("/me", verifyToken, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "No user found" });
  }
  res.json(req.user);
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@test.com" && password === "1234") {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign({ id: "1", role: "admin" }, secret, {
      expiresIn: "1h",
    });

    return res.json({ token });
  }

  if (email === "student@test.com" && password === "1234") {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign({ id: "2", role: "student" }, secret, {
      expiresIn: "1h",
    });

    return res.json({ token });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;