import { asyncRouter } from "../middleware/asyncRouter";
import { Router } from "express";
import {
  getReservations, reservationOptions, reservationReport,
  createReservation,
  updateReservation,
  deleteReservation
} from "../controllers/tripReservations";
import { verifyToken, adminOrTeacher, isAdmin, requireModuleAccess } from "../middleware/auth";

const router = asyncRouter();

router.get("/options", verifyToken, requireModuleAccess("reservar-viajes", "pagos-templos"), adminOrTeacher, reservationOptions);
router.get("/report", verifyToken, requireModuleAccess("reservar-viajes"), adminOrTeacher, reservationReport);
router.get("/", verifyToken, requireModuleAccess("reservar-viajes"), adminOrTeacher, getReservations);
router.post("/", verifyToken, requireModuleAccess("reservar-viajes"), isAdmin, createReservation);
router.put("/:id", verifyToken, requireModuleAccess("reservar-viajes"), isAdmin, updateReservation);
router.delete("/:id", verifyToken, requireModuleAccess("reservar-viajes"), isAdmin, deleteReservation);

export default router;
