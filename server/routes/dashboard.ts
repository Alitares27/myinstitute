import express from "express";
import { pool } from "../models/db";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.get("/dashboard-stats", verifyToken, async (req: any, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === "admin") {
      const students = await pool.query("SELECT COUNT(*) FROM students");
      const teachers = await pool.query("SELECT COUNT(*) FROM teachers");
      const courses = await pool.query("SELECT COUNT(*) FROM courses");
      const enrollments = await pool.query("SELECT COUNT(*) FROM enrollments");
      const attendance = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM attendance WHERE status ILIKE 'present') AS present_count,
          COALESCE(
            (SELECT SUM(
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) * 
              (SELECT COUNT(*) FROM topics t WHERE t.course_id = c.id)
            ) FROM courses c), 0) AS total_expected;
      `);

      const pCount = parseInt(attendance.rows[0].present_count || 0, 10);
      const eCount = parseInt(attendance.rows[0].total_expected || 0, 10);
      const rate = eCount > 0 ? Math.round((pCount / eCount) * 100) : 0;

      return res.json({
        students: students.rows[0].count,
        teachers: teachers.rows[0].count,
        courses: courses.rows[0].count,
        enrollments: enrollments.rows[0].count,
        attendanceRate: `${rate}%`,
      });
    }

    if (role === "teacher") {

      const teacherRes = await pool.query("SELECT id FROM teachers WHERE user_id = $1", [userId]);
      const teacherId = teacherRes.rows[0]?.id;

      if (!teacherId) {
        return res.json({ students: 0, courses: 0, attendanceRate: "0%" });
      }

      const studentsCount = await pool.query(
        "SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = $1)",
        [userId]
      );

      const coursesCount = await pool.query("SELECT COUNT(*) FROM courses WHERE teacher_id = $1", [userId]);

      const attendance = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM attendance a JOIN courses c ON a.course_id = c.id WHERE a.status ILIKE 'present' AND c.teacher_id = $1) AS present_count,
          COALESCE(
            (SELECT SUM(
              (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) * 
              (SELECT COUNT(*) FROM topics t WHERE t.course_id = c.id)
            ) FROM courses c WHERE c.teacher_id = $1), 0) AS total_expected;
      `, [userId]);

      const pCount = parseInt(attendance.rows[0].present_count || 0, 10);
      const eCount = parseInt(attendance.rows[0].total_expected || 0, 10);
      const rate = eCount > 0 ? Math.round((pCount / eCount) * 100) : 0;

      return res.json({
        students: studentsCount.rows[0].count,
        courses: coursesCount.rows[0].count,
        attendanceRate: `${rate}%`,
      });
    }

    if (role === "student") {
      const studentRes = await pool.query("SELECT id FROM students WHERE user_id = $1", [userId]);
      const studentId = studentRes.rows[0]?.id;

      if (!studentId) {
        return res.json({ courses: 0, attendanceRate: "0%", averageGrade: 0 });
      }

      const coursesCount = await pool.query("SELECT COUNT(*) FROM enrollments WHERE student_id = $1", [studentId]);

      const attendance = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM attendance WHERE status ILIKE 'present' AND student_id = $1) AS present_count,
          COALESCE(
            (SELECT SUM(
              (SELECT COUNT(*) FROM topics t WHERE t.course_id = e.course_id)
            ) FROM enrollments e WHERE e.student_id = $1), 0) AS total_expected;
      `, [studentId]);

      const pCount = parseInt(attendance.rows[0].present_count || 0, 10);
      const eCount = parseInt(attendance.rows[0].total_expected || 0, 10);
      const rate = eCount > 0 ? Math.round((pCount / eCount) * 100) : 0;

      const averageGrade = await pool.query(
        "SELECT AVG(grade) as avg FROM grades WHERE student_id = $1",
        [studentId]
      );

      return res.json({
        courses: coursesCount.rows[0].count,
        attendanceRate: `${rate}%`,
        averageGrade: Math.round((averageGrade.rows[0].avg || 0) * 10) / 10,
      });
    }

    res.status(403).json({ message: "Role not recognized" });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

export default router;