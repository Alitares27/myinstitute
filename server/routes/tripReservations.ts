import { asyncRouter } from "../middleware/asyncRouter";
import { Router } from "express";
import {
  getReservations, reservationOptions, reservationReport,
  createReservation,
  updateReservation,
  deleteReservation
} from "../controllers/tripReservations";
import { verifyToken, isAdmin } from "../middleware/auth";

const router = asyncRouter();

router.get("/options", verifyToken, isAdmin, reservationOptions);
router.get("/report", verifyToken, isAdmin, reservationReport);
router.get("/", verifyToken, isAdmin, getReservations);
router.post("/", verifyToken, isAdmin, createReservation);
router.put("/:id", verifyToken, isAdmin, updateReservation);
router.delete("/:id", verifyToken, isAdmin, deleteReservation);

export default router;
