import { Router } from "express";
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation
} from "../controllers/tripReservations";
import { verifyToken, isAdmin } from "../middleware/auth";

const router = Router();

router.get("/", verifyToken, getReservations);
router.post("/", verifyToken, isAdmin, createReservation);
router.put("/:id", verifyToken, isAdmin, updateReservation);
router.delete("/:id", verifyToken, isAdmin, deleteReservation);

export default router;
