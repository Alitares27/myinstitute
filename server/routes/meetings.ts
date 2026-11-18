import { asyncRouter } from "../middleware/asyncRouter";
import express from "express";

import {
    getMeetings,
    getMeeting,
    createMeeting,
    updateMeeting,
    deleteMeeting
} from "../controllers/meetings";

import {
    verifyToken,
    isAdmin, requireModuleAccess } from "../middleware/auth";

const router = asyncRouter();

router.get(
    "/",
    verifyToken, requireModuleAccess("consejos"),
    getMeetings
);

router.get(
    "/:id",
    verifyToken, requireModuleAccess("consejos"),
    getMeeting
);

router.post(
    "/",
    verifyToken, requireModuleAccess("consejos"),
    isAdmin,
    createMeeting
);


router.put(
    "/:id",
    verifyToken, requireModuleAccess("consejos"),
    isAdmin,
    updateMeeting
);

router.delete(
    "/:id",
    verifyToken, requireModuleAccess("consejos"),
    isAdmin,
    deleteMeeting
);

export default router;
