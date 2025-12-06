import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

interface AttendanceRecord {
  id: number;
  student_id: number;
  course_id: number;
  date: string;
  status: string;
}

interface Student {
  id: number;
  name: string;
}

interface Course {
  id: number;
  title: string;
}

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({
    student_id: "",
    course_id: "",
    date: "",
    status: "present",
  });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRole(res.data.role);
        setUserId(res.data.id);
      })
      .catch(() => setError("Error cargando usuario actual"));

    axios
      .get("http://localhost:5000/api/attendance", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAttendance(res.data))
      .catch(() => setError("Error cargando asistencia"));

    axios
      .get("http://localhost:5000/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setError("Error cargando estudiantes"));

    axios
      .get("http://localhost:5000/api/courses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCourses(res.data))
      .catch(() => setError("Error cargando cursos"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post("http://localhost:5000/api/attendance", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendance([...attendance, res.data]);
      setForm({ student_id: "", course_id: "", date: "", status: "present" });
    } catch (err) {
      setError("Error registrando asistencia");
    }
  };

  const filteredAttendance =
    role === "student" && userId
      ? attendance.filter((a) => a.student_id === userId)
      : studentFilter
      ? attendance.filter((a) => a.student_id === Number(studentFilter))
      : attendance;

  if (error) {
    return (
      <Layout>
        <p>{error}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="attendance-page">
        <h2>📅 Attendance</h2>

        {role === "admin" && (
          <>
            <form onSubmit={handleSubmit}>
              <select
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />

              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>

              <button type="submit">Mark Attendance</button>
            </form>

            <div className="attendance-filter">
              <label>Filtrar por estudiante: </label>
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              >
                <option value="">Todos</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ⚡ Mostrar mensaje si no hay registros */}
        {filteredAttendance.length === 0 ? (
          <p className="no-attendance">⚠️ No se registró asistencia para este estudiante.</p>
        ) : role === "admin" ? (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((a) => (
                <tr key={a.id ?? `${a.student_id}-${a.course_id}-${a.date}`}>
                  <td>
                    {students.find((s) => s.id === a.student_id)?.name ||
                      a.student_id}
                  </td>
                  <td>
                    {courses.find((c) => c.id === a.course_id)?.title ||
                      a.course_id}
                  </td>
                  <td>{new Date(a.date).toLocaleDateString("es-AR")}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="attendance-report">
            {filteredAttendance.map((a) => (
              <li key={a.id ?? `${a.student_id}-${a.course_id}-${a.date}`}>
                {`Course #${a.course_id} - ${new Date(a.date).toLocaleDateString(
                  "es-AR"
                )} - ${a.status}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}