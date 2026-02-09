import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortDirection = "asc" | "desc";

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ id: "", title: "", teacher_id: "" });
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: "", title: "", order_index: "" });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const meRes = await axios.get(`${API_BASE_URL}/users/me`, config);
        setRole(meRes.data.role);

        const coursesRes = await axios.get(`${API_BASE_URL}/courses`, config);
        setCourses(coursesRes.data);

        if (meRes.data.role === "admin") {
          const teachersRes = await axios.get(`${API_BASE_URL}/teachers`, config);
          setTeachers(teachersRes.data);
        }
      } catch {
        setError("No se pudieron cargar los datos.");
      }
    };
    fetchCoursesData();
  }, []);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedCourses = useMemo(() => {
    if (!sortConfig) return courses;
    const { key, direction } = sortConfig;

    return [...courses].sort((a, b) => {
      const aVal = a[key] ?? "";
      const bVal = b[key] ?? "";
      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [courses, sortConfig]);

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course);
    setTopicForm({ id: "", title: "", order_index: "" });
    loadTopics(course.id);
  };

  const loadTopics = async (courseId: string) => {
    setLoadingTopics(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopics(res.data);
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (topicForm.id) {
        await axios.put(`${API_BASE_URL}/topics/${topicForm.id}`, topicForm, config);
      } else {
        await axios.post(`${API_BASE_URL}/topics`, { ...topicForm, course_id: selectedCourse.id }, config);
      }
      setTopicForm({ id: "", title: "", order_index: "" });
      loadTopics(selectedCourse.id);
    } catch {
      alert("Error al guardar el tema");
    }
  };

  const handleTopicDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este tema?")) return;
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/topics/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadTopics(selectedCourse.id);
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        await axios.put(`${API_BASE_URL}/courses/${form.id}`, form, config);
      } else {
        await axios.post(`${API_BASE_URL}/courses`, form, config);
      }
      const updated = await axios.get(`${API_BASE_URL}/courses`, config);
      setCourses(updated.data);
      setForm({ id: "", title: "", teacher_id: "" });
      alert("Operación exitosa");
    } catch {
      setError("Error al guardar el curso.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este curso?")) return;
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(courses.filter(c => c.id !== id));
    } catch {
      setError("No se pudo eliminar el curso.");
    }
  };

  if (error) return <p>{error}</p>;

  return (
    <div className="page-container">
      <h1>📚 Cursos</h1>
      <h2> {role === "admin" ? "➕ Agregar" : "Disponibles"}</h2>
      {role === "admin" && (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Nombre del Curso"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
          <select
            value={form.teacher_id}
            onChange={e => setForm({ ...form, teacher_id: e.target.value })}
            required
          >
            <option value="">Asignar Maestro</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit">{form.id ? "Actualizar" : "Agregar"}</button>
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("title")} style={{ cursor: "pointer" }}>
              Título {sortConfig?.key === "title" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("teacher_name")} style={{ cursor: "pointer" }}>
              Maestro {sortConfig?.key === "teacher_name" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            {role === "admin" && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {sortedCourses.map(c => (
            <tr key={c.id}>
              <td
                onClick={() => handleCourseClick(c)}
                style={{ cursor: "pointer", fontWeight: "bold" }}
              >
                {c.title}
              </td>
              <td>{c.teacher_name || "No asignado"}</td>
              {role === "admin" && (
                <td>
                  <button onClick={() => setForm({ id: c.id, title: c.title, teacher_id: c.teacher_id || "" })}>✏️</button>
                  <button onClick={() => handleDelete(c.id)} style={{ color: "red" }}>🗑️</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCourse && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "8px",
            width: "65%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3>Temas: {selectedCourse.title}</h3>

            {role === "admin" && (
              <form onSubmit={handleTopicSubmit} style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
                <input placeholder="Nuevo Tema" value={topicForm.title}
                  onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} required />
                <input type="number" placeholder="Orden" value={topicForm.order_index}
                  onChange={e => setTopicForm({ ...topicForm, order_index: e.target.value })} required />
                <button type="submit">{topicForm.id ? "OK" : "＋"}</button>
                {topicForm.id && <button type="button" onClick={() => setTopicForm({ id: "", title: "", order_index: "" })}>X</button>}
              </form>
            )}

            {loadingTopics ? <p>Cargando...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tema</th>
                    {role === "admin" && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {topics.map(t => (
                    <tr key={t.id}>
                      <td>{t.order_index}</td>
                      <td>{t.title}</td>
                      {role === "admin" && (
                        <td>
                          <button onClick={() => setTopicForm({ id: t.id, title: t.title, order_index: t.order_index })}>✏️</button>
                          <button onClick={() => handleTopicDelete(t.id)} style={{ color: "red" }}>🗑️</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <button onClick={() => setSelectedCourse(null)} style={{ marginTop: "15px" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
