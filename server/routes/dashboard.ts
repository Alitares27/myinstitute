import express from "express";
import { pool } from "../models/db";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard-stats", verifyToken, async (_req, res) => {
  try {
    const students = await pool.query("SELECT COUNT(*) FROM students");
    const teachers = await pool.query("SELECT COUNT(*) FROM teachers");
    const courses = await pool.query("SELECT COUNT(*) FROM courses");
    const enrollments = await pool.query("SELECT COUNT(*) FROM enrollments");

    res.json({
      students: students.rows[0].count,
      teachers: teachers.rows[0].count,
      courses: courses.rows[0].count,
      enrollments: enrollments.rows[0].count,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

export default router;