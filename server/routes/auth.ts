import { Router } from "express";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
