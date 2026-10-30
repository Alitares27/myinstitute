import { asyncRouter } from "../middleware/asyncRouter";
import { Router } from "express";
import { verifyToken, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
