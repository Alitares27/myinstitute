import { useEffect, useState, useMemo } from "react";
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    course_id: "",
    date: "",
    status: "Present",
  });

  const [studentFilter, setStudentFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 5;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No hay sesión activa");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [userRes, attRes, stdRes, crsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/me`, { headers }),
          axios.get(`${API_BASE_URL}/attendance`, { headers }),
          axios.get(`${API_BASE_URL}/students`, { headers }),
          axios.get(`${API_BASE_URL}/courses`, { headers }),
        ]);

        setRole(userRes.data.role);
        setUserId(userRes.data.id);
        setAttendance(attRes.data);
        setStudents(stdRes.data);
        setCourses(crsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error al cargar los datos desde el servidor. Verifica la conexión.");
      }
    };

    fetchData();
  }, []);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      if (role === "student" && record.student_id !== userId) {
        return false;
      }

      if (studentFilter && record.student_id !== Number(studentFilter)) {
        return false;
      }

      if (dateFilter) {
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        if (recordDate !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [attendance, studentFilter, dateFilter, role, userId]);

  const attendanceStats = useMemo(() => {
    const totalPresent = filteredAttendance.filter(a => a.status === "Present").length;
    const maxClasses = 14;
    const percentage = Math.min((totalPresent / maxClasses) * 100, 100);
    return {
      percentage: Math.round(percentage),
      count: totalPresent
    };
  }, [filteredAttendance]);

  useEffect(() => {
    setCurrentPage(1);
  }, [studentFilter, dateFilter]);

  const totalPages = Math.ceil(filteredAttendance.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return filteredAttendance.slice(firstIdx, lastIdx);
  }, [filteredAttendance, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(`${API_BASE_URL}/attendance`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendance((prev) => [...prev, res.data]);
      setForm({ student_id: "", course_id: "", date: "", status: "Present" });
      alert("Asistencia registrada con éxito");
    } catch (err) {
      setError("Error registrando asistencia");
    }
  };

  if (error) return <div style={{ padding: "20px", color: "red" }}>⚠️ {error}</div>;

  return (
    <div className="attendance-page">
      <h2>📅 Control de Asistencia</h2>
      
      {role === "admin" && (
        <div className="admin-section">
          <h3>{form.student_id ? "✏️ Editar Asistencia" : "➕ Marcar Asistencia"}</h3>
          <form onSubmit={handleSubmit} className="attendance-form">
            <select
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              required
            >
              <option value="">Elegir Estudiante</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              required
            >
              <option value="">Elegir Curso</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />

            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Present">Presente</option>
              <option value="Absent">Ausente</option>
            </select>

            <button type="submit" className="btn-submit">Marcar</button>
          </form>

          <hr style={{ margin: "20px 0", border: "0.5px solid #ddd" }} />

          <div className="filters-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ flex: 1 }}>
              <h3>🔍 Filtros de Búsqueda</h3>
              <div style={{ display: "flex", gap: "20px" }}>
                <div>
                  <label>Por Estudiante: </label>
                  <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
                    <option value="">Todos</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Por Fecha: </label>
                  <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                  {dateFilter && <button onClick={() => setDateFilter("")} style={{ marginLeft: "5px" }}>Limpiar</button>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "150px" }}>
              <div style={{ position: "relative", width: "100px", height: "100px" }}>
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke="#e6e6e6"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke={attendanceStats.percentage >= 75 ? "#4caf50" : "#ff9800"}
                    strokeWidth="10"
                    strokeDasharray={`${attendanceStats.percentage * 2.51} 251`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                  />
                  <text
                    x="50" y="55"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#333"
                  >
                    {attendanceStats.percentage}%
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredAttendance.length === 0 ? (
        <p style={{ marginTop: "20px" }}>No se encontraron registros de asistencia.</p>
      ) : (
        <>
          <div className="table-responsive">
            <table border={1} cellPadding={10} style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  {role === "admin" && <th>Estudiante</th>}
                  <th>Curso</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((a) => (
                  <tr key={a.id}>
                    {role === "admin" && (
                      <td>{students.find((s) => s.id === a.student_id)?.name || `ID: ${a.student_id}`}</td>
                    )}
                    <td>{courses.find((c) => c.id === a.course_id)?.title || `ID: ${a.course_id}`}</td>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td style={{ color: a.status === "Present" ? "green" : "red", fontWeight: "bold" }}>
                      {a.status === "Present" ? "Presente" : "Ausente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination" style={{ marginTop: "20px", display: "flex", gap: "5px" }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: currentPage === i + 1 ? "#007bff" : "#fff",
                  color: currentPage === i + 1 ? "#fff" : "#000",
                  border: "1px solid #ddd",
                  cursor: "pointer"
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}