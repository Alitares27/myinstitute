import { Router } from "express";
import { createTempleAmortization } from "../controllers/templeAmortizations";
import { verifyToken, isAdmin } from "../middleware/auth";

const router = Router();

router.post("/", verifyToken, isAdmin, createTempleAmortization);

export default router;
