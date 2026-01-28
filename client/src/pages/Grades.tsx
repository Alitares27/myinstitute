import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function Grades() {
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    course_id: "",
    grade: "",
    grade_type: "examen",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const meRes = await axios.get(`${API_BASE_URL}/users/me`, config);
      setRole(meRes.data.role);

      const gradesRes = await axios.get(`${API_BASE_URL}/grades`, config);
      setGrades(gradesRes.data);

      if (meRes.data.role === "admin") {
        const [sRes, cRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/students`, config),
          axios.get(`${API_BASE_URL}/courses`, config),
        ]);
        setStudents(sRes.data);
        setCourses(cRes.data);
      }
    } catch {
      setError("Error al sincronizar con el servidor");
    }
  };

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const matchStudent = filterStudent === "" || g.student_id.toString() === filterStudent;
      const matchType = filterType === "" || g.grade_type === filterType;
      return matchStudent && matchType;
    });
  }, [grades, filterStudent, filterType]);

  const sortedGrades = useMemo(() => {
    if (!sortConfig) return filteredGrades;
    return [...filteredGrades].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredGrades, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStudent, filterType, sortConfig]);

  const totalPages = Math.ceil(sortedGrades.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return sortedGrades.slice(firstIdx, lastIdx);
  }, [sortedGrades, currentPage]);

  const requestSort = (key: string) => {
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        await axios.put(`${API_BASE_URL}/grades/${form.id}`, form, config);
      } else {
        await axios.post(`${API_BASE_URL}/grades`, form, config);
      }
      setForm({ id: "", student_id: "", course_id: "", grade: "", grade_type: "examen" });
      fetchData();
    } catch {
      setError("No se pudo procesar la operación.");
    }
  };

  const handleEditClick = (record: any) => {
    setForm({
      id: record.id,
      student_id: record.student_id.toString(),
      course_id: record.course_id.toString(),
      grade: record.grade.toString(),
      grade_type: record.grade_type,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta calificación?")) return;
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/grades/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGrades(grades.filter((g) => g.id !== id));
    } catch {
      setError("Error al eliminar el registro.");
    }
  };

  return (
    <div className="grades-page">
      <h1>📊 Calificaciones</h1>

      {role === "admin" && (
        <div className="form-container">
          <h2>{form.id ? "✏️ Actualizar" : "➕ Calificar"}</h2>
          <form onSubmit={handleSubmit}>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
              <option value="">-- Seleccionar Estudiante --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
              <option value="">-- Seleccionar Curso --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <input type="number" step="0.1" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />

            <select value={form.grade_type} onChange={(e) => setForm({ ...form, grade_type: e.target.value })}>
              <option value="examen">Examen</option>
              <option value="Lectura">Lectura</option>
              <option value="proyecto">Proyecto</option>
              <option value="participacion">Participación</option>
            </select>

            <button type="submit">{form.id ? "Actualizar" : "Calificar"}</button>
            {form.id && (
              <button type="button" onClick={() => setForm({ id: "", student_id: "", course_id: "", grade: "", grade_type: "examen" })}>
                Cancelar
              </button>
            )}
          </form>
        </div>
      )}

      <div className="filters-section">
        {role === "admin" && (
          <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
            <option value="">Todos los estudiantes</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="examen">Examen</option>
          <option value="Lectura">Lectura</option>
          <option value="proyecto">Proyecto</option>
          <option value="participacion">Participación</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            {role === "admin" && <th onClick={() => requestSort("student_name")}>Estudiante</th>}
            <th onClick={() => requestSort("course_title")}>Curso</th>
            <th onClick={() => requestSort("grade")}>Nota</th>
            <th onClick={() => requestSort("grade_type")}>Tipo</th>
            <th onClick={() => requestSort("created_at")}>Fecha</th>
            {role === "admin" && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {currentRecords.length > 0 ? (
            currentRecords.map((g) => (
              <tr key={g.id}>
                {role === "admin" && <td>{g.student_name}</td>}
                <td>{g.course_title}</td>
                <td>{g.grade}</td>
                <td>{g.grade_type}</td>
                <td>{new Date(g.created_at).toLocaleDateString()}</td>
                {role === "admin" && (
                  <td>
                    <button onClick={() => handleEditClick(g)}>✏️</button>
                    <button onClick={() => handleDelete(g.id)}>🗑️</button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>Sin registros.</td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={currentPage === i + 1 ? "active" : ""}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {error && <p>{error}</p>}
    </div>
  );
}
