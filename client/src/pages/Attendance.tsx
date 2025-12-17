import { useEffect, useState } from "react";
import axios from "axios";

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

const API_URL = "http://localhost:5000"; 

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
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 5;

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`${API_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRole(res.data.role);
        setUserId(res.data.id);
      })
      .catch(() => setError("Error cargando usuario actual"));

    axios
      .get(`${API_URL}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAttendance(res.data))
      .catch(() => setError("Error cargando asistencia"));

    axios
      .get(`${API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStudents(res.data))
      .catch(() => setError("Error cargando estudiantes"));

    axios
      .get(`${API_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCourses(res.data))
      .catch(() => setError("Error cargando cursos"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(`${API_URL}/api/attendance`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendance([...attendance, res.data]);
      setForm({ student_id: "", course_id: "", date: "", status: "present" });
    } catch (err) {
      setError("Error registrando asistencia");
    }
  };

  let filteredAttendance = attendance;
  if (role === "student" && userId) {
    filteredAttendance = filteredAttendance.filter((a) => a.student_id === userId);
  }
  if (studentFilter) {
    filteredAttendance = filteredAttendance.filter(
      (a) => a.student_id === Number(studentFilter)
    );
  }
  if (dateFilter) {
    filteredAttendance = filteredAttendance.filter(
      (a) => a.date.startsWith(dateFilter)
    );
  }

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAttendance.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredAttendance.length / recordsPerPage);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="attendance-page">
      <h2>📅 Asistencia</h2>

      {role === "admin" && (
        <>
          <form onSubmit={handleSubmit}>
            <select
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            >
              <option value="">Elegir Estudiante</option>
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
              <option value="">Elegir Curso</option>
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
              <option value="Present">Presente</option>
              <option value="Absent">Ausente</option>
            </select>

            <button type="submit">Marcar Asistencia</button>
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

            <label>Filtrar por fecha: </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </>
      )}

      {filteredAttendance.length === 0 ? (
        <p className="no-attendance">
          ⚠️ No se registró asistencia con los filtros aplicados.
        </p>
      ) : role === "admin" ? (
        <>
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Curso</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((a) => (
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

          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={currentPage === i + 1 ? "active" : ""}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      ) : (
        <ul className="attendance-report">
          {currentRecords.map((a) => (
            <li key={a.id ?? `${a.student_id}-${a.course_id}-${a.date}`}>
              {`Curso #${a.course_id} - ${new Date(a.date).toLocaleDateString(
                "es-AR"
              )} - ${a.status}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}