import { asyncRouter } from "../middleware/asyncRouter";
import express from "express";
import { pool } from "../models/db";
import { verifyToken, requireModuleAccess, AuthRequest } from "../middleware/auth";
import { courseAccess } from "../utils/courseAccess";

const router = asyncRouter();

router.get("/dashboard-cards", verifyToken, requireModuleAccess("panel"), async (req:AuthRequest,res) => {
  const {role,id,permissions=[]}=req.user!;
  if(role==='teacher'||role==='student'){
    const courses=await pool.query(`SELECT c.id,c.title,c.description,u.name AS teacher_name
      FROM courses c LEFT JOIN teachers t ON t.id=c.teacher_id LEFT JOIN users u ON u.id=t.user_id
      WHERE ${courseAccess('c','$1','$2')} ORDER BY c.title,c.id`,[role,id]);
    return res.json({courses:courses.rows,trip:null});
  }
  if(role==='finance'&&permissions.some(module=>module==='viajes-templo'||module==='reservar-viajes'||module==='pagos-templos')){
    const trip=await pool.query(`SELECT tt.id,t.name AS temple_name,tt.trip_date AS date,tt.cost,tt.status
      FROM temple_trips tt JOIN temples t ON t.id=tt.temple_id
      WHERE tt.archived_at IS NULL AND t.archived_at IS NULL AND tt.status='programado'
      AND tt.trip_date >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      ORDER BY tt.trip_date,tt.id LIMIT 1`);
    return res.json({courses:[],trip:trip.rows[0]??null});
  }
  return res.json({courses:[],trip:null});
});

router.get("/dashboard-stats", verifyToken, requireModuleAccess("panel"), async (req: any, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === "admin") {
      const statsRes = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM students) AS students,
          (SELECT COUNT(*) FROM teachers) AS teachers,
          (SELECT COUNT(*) FROM courses) AS courses,
          (SELECT COUNT(*) FROM enrollments) AS enrollments,
          (SELECT COUNT(*) FROM activity_plans WHERE activity_datetime <= NOW()) AS completed_activities
      `);

      const row = statsRes.rows[0];
      return res.json({
        students: row.students,
        teachers: row.teachers,
        courses: row.courses,
        enrollments: row.enrollments,
        completedActivities: row.completed_activities,
      });
    }

    if (role === "teacher") {
      const teacherRes = await pool.query("SELECT id FROM teachers WHERE user_id = $1", [userId]);
      const teacherId = teacherRes.rows[0]?.id;

      if (!teacherId) {
        return res.json({ students: 0, courses: 0, attendanceRate: "0%" });
      }

      const [studentsCount, coursesCount, attendance] = await Promise.all([
        pool.query(
          "SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = $1)",
          [teacherId]
        ),
        pool.query("SELECT COUNT(*) FROM courses WHERE teacher_id = $1", [teacherId]),
        pool.query(`SELECT COUNT(*) FILTER(WHERE a.status='Present') AS present_count,COUNT(*) AS total_expected
          FROM attendance a JOIN courses c ON c.id=a.course_id WHERE c.teacher_id=$1 AND a.status IN ('Present','Absent')`,[teacherId])
      ]);

      const pCount = parseInt(attendance.rows[0]?.present_count || 0, 10);
      const eCount = parseInt(attendance.rows[0]?.total_expected || 0, 10);
      const rate = eCount > 0 ? Math.round((pCount / eCount) * 100) : 0;

      return res.json({
        students: studentsCount.rows[0]?.count || 0,
        courses: coursesCount.rows[0]?.count || 0,
        attendanceRate: `${rate}%`,
      });
    }

    if (role === "student") {
      const studentRes = await pool.query("SELECT id FROM students WHERE user_id = $1", [userId]);
      const studentId = studentRes.rows[0]?.id;

      if (!studentId) {
        return res.json({ courses: 0, attendanceRate: "0%", averageGrade: 0 });
      }

      const [coursesCount, attendance, averageGrade] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM enrollments WHERE student_id = $1", [studentId]),
        pool.query(`SELECT COUNT(*) FILTER(WHERE status='Present') AS present_count,COUNT(*) AS total_expected
          FROM attendance WHERE student_id=$1 AND status IN ('Present','Absent')`,[studentId]),
        pool.query(
          "SELECT AVG(grade) as avg FROM grades WHERE student_id = $1",
          [studentId]
        )
      ]);

      const pCount = parseInt(attendance.rows[0]?.present_count || 0, 10);
      const eCount = parseInt(attendance.rows[0]?.total_expected || 0, 10);
      const rate = eCount > 0 ? Math.round((pCount / eCount) * 100) : 0;

      return res.json({
        courses: coursesCount.rows[0]?.count || 0,
        attendanceRate: `${rate}%`,
        averageGrade: Math.round((averageGrade.rows[0]?.avg || 0) * 10) / 10,
      });
    }

    res.status(403).json({ message: "Role not recognized" });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
});

export default router;
