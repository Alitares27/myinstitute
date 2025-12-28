import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

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
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const meRes = await axios.get(`${API_URL}/users/me`, config);
      setRole(meRes.data.role);

      const gradesRes = await axios.get(`${API_URL}/grades`, config);
      setGrades(gradesRes.data);

      if (meRes.data.role === "admin") {
        const [sRes, cRes] = await Promise.all([
          axios.get(`${API_URL}/students`, config),
          axios.get(`${API_URL}/courses`, config),
        ]);
        setStudents(sRes.data);
        setCourses(cRes.data);
      }
    } catch (err) {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStudent, filterType]);

  const totalPages = Math.ceil(filteredGrades.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return filteredGrades.slice(firstIdx, lastIdx);
  }, [filteredGrades, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        await axios.put(`${API_URL}/grades/${form.id}`, form, config);
      } else {
        await axios.post(`${API_URL}/grades`, form, config);
      }

      setForm({ id: "", student_id: "", course_id: "", grade: "", grade_type: "examen" });
      fetchData();
    } catch (err) {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta calificación?")) return;
    try {
      await axios.delete(`${API_URL}/grades/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setGrades(grades.filter((g) => g.id !== id));
    } catch {
      setError("Error al eliminar el registro.");
    }
  };

  return (
    <div className="grades-page">
      <h2>📊 Calificaciones</h2>
      <h3>{form.id ? "✏️ Actualizar" : "➕ Calificar"}</h3>
      {role === "admin" && (
        <div >
          <form onSubmit={handleSubmit}>

            <select
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              required
            >
              <option value="">-- Seleccionar Estudiante --</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              required
            >
              <option value="">-- Seleccionar Curso --</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>

            <input
              type="number"
              step="0.1"
              placeholder="Calificación"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              required
              style={{ width: "100px" }}
            />

            <select
              value={form.grade_type}
              onChange={(e) => setForm({ ...form, grade_type: e.target.value })}
            >
              <option value="examen">Examen</option>
              <option value="Lectura">Lectura</option>
              <option value="proyecto">Proyecto</option>
              <option value="participacion">Participación</option>
            </select>

            <button type="submit">
              {form.id ? "Actualizar" : "Calificar"}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm({ id: "", student_id: "", course_id: "", grade: "", grade_type: "examen" })}>
                Cancelar
              </button>
            )}
          </form>
        </div >
      )}

      <div className="filters-section" style={{ background: "#e9ecef", padding: "15px", borderRadius: "8px", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
        <strong>🔍 Filtrar por:</strong>

        {role === "admin" && (
          <div>
            <label>Estudiante: </label>
            <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
              <option value="">Todos los estudiantes</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label>Tipo: </label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="examen">Examen</option>
            <option value="Lectura">Lectura</option>
            <option value="proyecto">Proyecto</option>
            <option value="participacion">Participación</option>
          </select>
        </div>

        {(filterStudent || filterType) && (
          <button onClick={() => { setFilterStudent(""); setFilterType(""); }} style={{ padding: "4px 10px", cursor: "pointer" }}>
            Limpiar Filtros
          </button>
        )}
      </div>

      <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#333", color: "white" }}>
            {role === "admin" && <th style={{ padding: "10px" }}>Estudiante</th>}
            <th style={{ padding: "10px" }}>Curso</th>
            <th style={{ padding: "10px" }}>Nota</th>
            <th style={{ padding: "10px" }}>Tipo</th>
            <th style={{ padding: "10px" }}>Fecha</th>
            {role === "admin" && <th style={{ padding: "10px" }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {currentRecords.length > 0 ? (
            currentRecords.map((g) => (
              <tr key={g.id}>
                {role === "admin" && <td style={{ padding: "10px" }}>{g.student_name}</td>}
                <td style={{ padding: "10px" }}>{g.course_title}</td>
                <td style={{ padding: "10px", fontWeight: "bold", color: g.grade >= 6 ? "green" : "red" }}>{g.grade}</td>
                <td style={{ padding: "10px" }}>{g.grade_type}</td>
                <td style={{ padding: "10px" }}>{new Date(g.created_at).toLocaleDateString()}</td>
                {role === "admin" && (
                  <td style={{ padding: "10px" }}>
                    <button onClick={() => handleEditClick(g)} >✏️</button>
                    <button onClick={() => handleDelete(g.id)} >🗑️</button>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={role === "admin" ? 6 : 4} style={{ textAlign: "center", padding: "20px" }}>
                No se encontraron calificaciones con los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ marginTop: "15px", display: "flex", gap: "5px", justifyContent: "center" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                padding: "2px 10px",
                backgroundColor: currentPage === i + 1 ? "#333" : "#fff",
                color: currentPage === i + 1 ? "#fff" : "#333",
                cursor: "pointer"
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}