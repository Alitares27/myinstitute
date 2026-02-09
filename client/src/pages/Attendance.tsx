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
type SortDirection = "asc" | "desc";

export default function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: "",
    course_id: "",
    topic_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "Present",
  });

  const [studentFilter, setStudentFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 7;

  const [sortConfig, setSortConfig] =
    useState<{ key: string; direction: SortDirection } | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setError("No hay sesión activa");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${API_BASE_URL}/users/me`, { headers }),
      axios.get(`${API_BASE_URL}/attendance`, { headers }),
      axios.get(`${API_BASE_URL}/students`, { headers }),
      axios.get(`${API_BASE_URL}/courses`, { headers }),
      axios.get(`${API_BASE_URL}/topics`, { headers }),
    ])
      .then(([userRes, attRes, stdRes, crsRes, topRes]) => {
        setRole(userRes.data.role);
        setUserId(userRes.data.id);
        setAttendance(attRes.data);
        setStudents(stdRes.data);
        setCourses(crsRes.data);
        setAllTopics(topRes.data);
      })
      .catch(() => setError("Error al conectar con el servidor"));
  }, []);

  const filteredTopics = useMemo(() => {
    if (!form.course_id) return [];
    return allTopics.filter(t => t.course_id === Number(form.course_id));
  }, [allTopics, form.course_id]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (role === "student" && a.student_id !== userId) return false;
      if (studentFilter && a.student_id !== Number(studentFilter)) return false;
      if (courseFilter && a.course_id !== Number(courseFilter)) return false;
      if (dateFilter) {
        const d = new Date(a.date).toISOString().split("T")[0];
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [attendance, studentFilter, courseFilter, dateFilter, role, userId]);

  const sortedAttendance = useMemo(() => {
    if (!sortConfig) return filteredAttendance;
    const { key, direction } = sortConfig;

    return [...filteredAttendance].sort((a, b) => {
      let aVal: any = a[key as keyof AttendanceRecord];
      let bVal: any = b[key as keyof AttendanceRecord];

      if (key === "date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAttendance, sortConfig]);

  const totalPages = Math.ceil(sortedAttendance.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedAttendance.slice(start, start + recordsPerPage);
  }, [sortedAttendance, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");

    try {
      const res = await axios.post(`${API_BASE_URL}/attendance`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const topic = allTopics.find(t => t.id === Number(form.topic_id));
      setAttendance(prev => [
        { ...res.data, topic: topic?.title || "—" },
        ...prev,
      ]);

      setForm({ ...form, student_id: "", topic_id: "" });
    } catch {
      setError("Error al registrar asistencia");
    }
  };

  if (error) return <div className="error">⚠️ {error}</div>;

  return (
    <div className="attendance-page">
      <h1>📅 Control de Asistencia</h1>
      <h2>{role === "admin" ? " ➕ Registrar" : "Revisar"}</h2>
      {(role === "admin" || role === "teacher") && (
        <form onSubmit={handleSubmit} className="grid-form">
          <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
            <option value="">Estudiante</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value, topic_id: "" })}>
            <option value="">Curso</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>

          <select required value={form.topic_id} onChange={e => setForm({ ...form, topic_id: e.target.value })}>
            <option value="">Capítulo</option>
            {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>

          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />

          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="Present">Presente</option>
            <option value="Absent">Ausente</option>
          </select>

          <button>Guardar</button>
        </form>
      )}

      <div className="grid-form">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />

        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
          <option value="">Todos los cursos</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        {role !== "student" && (
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
            <option value="">Todos los estudiantes</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <table>
        <thead>
          <tr>
            {role !== "student" && <th onClick={() => handleSort("student_id")}>Estudiante</th>}
            <th onClick={() => handleSort("course_id")}>Curso</th>
            <th onClick={() => handleSort("date")}>Fecha</th>
            <th onClick={() => handleSort("status")}>Estado</th>
            <th>Capítulo</th>
          </tr>
        </thead>
        <tbody>
          {currentRecords.map(a => (
            <tr key={a.id}>
              {role !== "student" && <td>{students.find(s => s.id === a.student_id)?.name}</td>}
              <td>{courses.find(c => c.id === a.course_id)?.title}</td>
              <td>{new Date(a.date).toLocaleDateString()}</td>
              <td>{a.status}</td>
              <td>{a.topic || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            className={currentPage === i + 1 ? "active" : ""}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
