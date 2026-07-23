import { Router } from "express";
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation
} from "../controllers/tripReservations";
import { verifyToken } from "../middleware/auth";

const router = Router();

router.get("/", verifyToken, getReservations);
router.post("/", verifyToken, createReservation);
router.put("/:id", verifyToken, updateReservation);
router.delete("/:id", verifyToken, deleteReservation);

export default router;
