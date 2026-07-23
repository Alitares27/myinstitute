import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiBarChart2 } from "react-icons/fi";
import { formatDate } from "../utils/dateUtils";
import { Skeleton } from "../components/Skeleton";

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
  const [loading, setLoading] = useState(true);

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
      const meRes = await Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") });
      setRole(meRes.data.role);

      const gradesRes = await api.get("/grades");
      setGrades(gradesRes.data);

      if (meRes.data.role === "admin") {
        const [sRes, cRes] = await Promise.all([
          api.get("/students"),
          api.get("/courses"),
        ]);
        setStudents(sRes.data);
        setCourses(cRes.data);
      }
    } catch {
      setError("Error al sincronizar con el servidor");
    } finally {
      setLoading(false);
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

    try {
      if (form.id) {
        await api.put(`/grades/${form.id}`, form);
      } else {
        await api.post("/grades", form);
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
      await api.delete(`/grades/${id}`);
      setGrades(grades.filter((g) => g.id !== id));
    } catch {
      setError("Error al eliminar el registro.");
    }
  };

  if (loading) {
    return (
        <div className="grades-page">
            <Skeleton width="220px" height="1.8rem" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1rem" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Skeleton height="2.5rem" style={{ flex: 1 }} />
                    <Skeleton height="2.5rem" style={{ flex: 1 }} />
                    <Skeleton height="2.5rem" style={{ flex: 1 }} />
                </div>
                <Skeleton height="2.5rem" width="120px" />
            </div>
            <div style={{ marginTop: "1.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: "1rem" }}>
                            <Skeleton height="1rem" style={{ flex: 2 }} />
                            <Skeleton height="1rem" style={{ flex: 1 }} />
                            <Skeleton height="1rem" style={{ flex: 1 }} />
                            <Skeleton height="1rem" style={{ flex: 1 }} />
                            <Skeleton height="1rem" style={{ flex: 1 }} />
                            <Skeleton width="70px" height="1.8rem" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="grades-page">
      <h1><span className="page-title-icon"><FiBarChart2 /></span> Calificaciones</h1>
      {role === "admin" && (
        <div className="form-container">
          <h2 className="dashboard-subtitle">{form.id ? <><IoCreateOutline /> Actualizar</> : <><FaPlus /> Calificar</>}</h2>
          <form onSubmit={handleSubmit}>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
              <option value="">Elegir Estudiante </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
              <option value="">Elegir Curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <input type="number" step="0.1" placeholder="Calificación" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />

            <select value={form.grade_type} onChange={(e) => setForm({ ...form, grade_type: e.target.value })}>
              <option value="examen">Examen</option>
              <option value="Lectura">Lectura</option>
              <option value="participacion">Participación</option>
            </select>

            <div className="form-group full-width">
              <button type="submit" className="btn primary">{form.id ? "Actualizar" : "Calificar"}</button>
              {(form.id || form.student_id || form.course_id || form.grade) && (
                <button type="button" onClick={() => setForm({ id: "", student_id: "", course_id: "", grade: "", grade_type: "examen" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
              )}
            </div>          </form>
        </div>
      )}

      <div className="grid-form extracted-style-2">
        {role === "admin" && (
          <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
            <option value="">Todos los miembros</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="examen">Examen</option>
          <option value="Lectura">Lectura</option>
          <option value="participacion">Participación</option>
        </select>
      </div>

      <div className="table-container">
        <table >
          <thead>
            <tr>
              {role === "admin" && (
                <th onClick={() => requestSort("student_name")} className="sortable-header">
                  Estudiante
                  <span className="sort-icon">
                    {sortConfig?.key === "student_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
              )}
              <th onClick={() => requestSort("course_title")} className="sortable-header">
                Curso
                <span className="sort-icon">
                  {sortConfig?.key === "course_title" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => requestSort("grade")} className="sortable-header">
                Nota
                <span className="sort-icon">
                  {sortConfig?.key === "grade" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => requestSort("grade_type")} className="sortable-header">
                Tipo
                <span className="sort-icon">
                  {sortConfig?.key === "grade_type" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => requestSort("created_at")} className="sortable-header">
                Fecha
                <span className="sort-icon">
                  {sortConfig?.key === "created_at" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
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
                  <td>{formatDate(g.created_at)}</td>

                  {role === "admin" && (
                    <td>
                      <button className="btn secondary extracted-style-4" onClick={() => handleEditClick(g)} aria-label="Editar"><IoCreateOutline /></button>
                      <button className="btn secondary extracted-style-5" onClick={() => handleDelete(g.id)} aria-label="Eliminar"><IoTrashOutline /></button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={role === "admin" ? 6 : 4}>Sin registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-dropdown">
          <span>PÁGINA:</span>
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p>{error}</p>}
    </div>
  );
}
