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

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;