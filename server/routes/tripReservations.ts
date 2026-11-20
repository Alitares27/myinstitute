import { asyncRouter } from "../middleware/asyncRouter";
import { Router } from "express";
import {
  getReservations, reservationOptions, reservationReport,
  createReservation,
  updateReservation,
  deleteReservation
} from "../controllers/tripReservations";
import { verifyToken, adminOrTeacher, adminOrFinance, requireModuleAccess } from "../middleware/auth";

const router = asyncRouter();

router.get("/options", verifyToken, requireModuleAccess("reservar-viajes", "pagos-templos"), adminOrTeacher, reservationOptions);
router.get("/report", verifyToken, requireModuleAccess("reservar-viajes"), adminOrTeacher, reservationReport);
router.get("/", verifyToken, requireModuleAccess("reservar-viajes"), adminOrTeacher, getReservations);
router.post("/", verifyToken, requireModuleAccess("reservar-viajes"), adminOrFinance, createReservation);
router.put("/:id", verifyToken, requireModuleAccess("reservar-viajes"), adminOrFinance, updateReservation);
router.delete("/:id", verifyToken, requireModuleAccess("reservar-viajes"), adminOrFinance, deleteReservation);

export default router;
