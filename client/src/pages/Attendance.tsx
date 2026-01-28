import { useEffect, useState, useMemo } from "react";
import axios from "axios";

interface AttendanceRecord {
  id: number;
  student_id: number;
  course_id: number;
  date: string;
  status: string;
  topic?: string;
  topic_id?: number | null;
}

interface Student { id: number; name: string; }
interface Course { id: number; title: string; }
interface Topic { id: number; course_id: number; title: string; }

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado inicial con fecha de hoy por defecto
  const [form, setForm] = useState({
    student_id: "",
    course_id: "",
    topic_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "Present",
  });

  const [studentFilter, setStudentFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 10;

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("No hay sesión activa");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [userRes, attRes, stdRes, crsRes, topRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/me`, { headers }),
          axios.get(`${API_BASE_URL}/attendance`, { headers }),
          axios.get(`${API_BASE_URL}/students`, { headers }),
          axios.get(`${API_BASE_URL}/courses`, { headers }),
          axios.get(`${API_BASE_URL}/topics`, { headers }), 
        ]);

        setRole(userRes.data.role);
        setUserId(userRes.data.id);
        setAttendance(attRes.data);
        setStudents(stdRes.data);
        setCourses(crsRes.data);
        setAllTopics(topRes.data);
      } catch (err) {
        setError("Error al conectar con el servidor.");
      }
    };
    fetchData();
  }, []);

  const filteredTopics = useMemo(() => {
    if (!form.course_id) return [];
    return allTopics.filter((t) => t.course_id === Number(form.course_id));
  }, [allTopics, form.course_id]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      if (role === "student" && record.student_id !== userId) return false;
      if (studentFilter && record.student_id !== Number(studentFilter)) return false;
      if (dateFilter) {
        const recordDate = new Date(record.date).toISOString().split("T")[0];
        if (recordDate !== dateFilter) return false;
      }
      return true;
    });
  }, [attendance, studentFilter, dateFilter, role, userId]);

  // Estadísticas para las Cards del Dashboard
  const attendanceStats = useMemo(() => {
    const totalFiltered = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(a => a.status === "Present" || a.status === "Presente").length;
    const percentage = totalFiltered > 0 ? (presentCount / totalFiltered) * 100 : 0;
    return { percentage: Math.round(percentage), count: presentCount, total: totalFiltered };
  }, [filteredAttendance]);

  const totalPages = Math.ceil(filteredAttendance.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return filteredAttendance.slice(firstIdx, lastIdx);
  }, [filteredAttendance, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    try {
      const res = await axios.post(`${API_BASE_URL}/attendance`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const selectedTopic = allTopics.find(t => t.id === Number(form.topic_id));
      const newRecord = { ...res.data, topic: selectedTopic ? selectedTopic.title : "N/A" };
      setAttendance((prev) => [newRecord, ...prev]);
      setForm({ ...form, student_id: "", topic_id: "" });
      alert("Asistencia guardada");
    } catch (err) {
      setError("Error al registrar la asistencia");
    }
  };

  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div className="attendance-page">
      <h1>📅 Control de Asistencia</h1>
      {(role === "admin" || role === "teacher") && (
        <div className="form-container-wrapper">
          <h3 style={{ padding: "10px 0" }}>➕ Registrar Nueva Asistencia</h3>
          <form onSubmit={handleSubmit} className="grid-form">
            <div className="form-group">
              <label>Estudiante</label>
              <select 
                value={form.student_id} 
                onChange={(e) => setForm({ ...form, student_id: e.target.value })} 
                required
              >
                <option value="">Seleccionar...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Curso</label>
              <select 
                value={form.course_id} 
                onChange={(e) => setForm({ ...form, course_id: e.target.value, topic_id: "" })} 
                required
              >
                <option value="">Seleccionar...</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Capítulo/Tema</label>
              <select 
                value={form.topic_id} 
                onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
                disabled={!form.course_id}
                required
              >
                <option value="">-- Seleccionar --</option>
                {filteredTopics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha</label>
              <input 
                type="date" 
                value={form.date} 
                onChange={(e) => setForm({ ...form, date: e.target.value })} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Present">Presente</option>
                <option value="Absent">Ausente</option>
              </select>
            </div>

            <button type="submit" className="btn primary">Marcar</button>
          </form>
        </div>
      )}

      {/* FILTROS DE BÚSQUEDA */}
      <div className="grid-form" style={{ marginBottom: "1rem", background: "transparent", boxShadow: "none", padding: "0" }}>
        <div className="form-group">
          <label>Filtrar por Fecha</label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
        {role !== "student" && (
          <div className="form-group">
            <label>Filtrar por Estudiante</label>
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
              <option value="">Todos</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* TABLA DE ASISTENCIA */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {role !== "student" && <th>Estudiante</th>}
              <th>Curso</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Capítulo</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((a) => (
              <tr key={a.id}>
                {role !== "student" && (
                  <td>{students.find(s => s.id === a.student_id)?.name || `ID: ${a.student_id}`}</td>
                )}
                <td>{courses.find(c => c.id === a.course_id)?.title || `ID: ${a.course_id}`}</td>
                <td>{new Date(a.date).toLocaleDateString('es-AR')}</td>
                <td style={{ color: (a.status === "Present" || a.status === "Presente") ? "var(--success)" : "var(--danger)", fontWeight: "bold" }}>
                  {a.status}
                </td>
                <td style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{a.topic || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => (
          <button 
            key={i + 1} 
            onClick={() => setCurrentPage(i + 1)} 
            className={currentPage === i + 1 ? "active" : ""}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}