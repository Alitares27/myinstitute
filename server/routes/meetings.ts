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
    isAdmin
} from "../middleware/auth";

const router = express.Router();

router.get(
    "/",
    verifyToken,
    getMeetings
);

router.get(
    "/:id",
    verifyToken,
    getMeeting
);

router.post(
    "/",
    verifyToken,
    isAdmin,
    createMeeting
);


router.put(
    "/:id",
    verifyToken,
    isAdmin,
    updateMeeting
);

router.delete(
    "/:id",
    verifyToken,
    isAdmin,
    deleteMeeting
);

export default router;