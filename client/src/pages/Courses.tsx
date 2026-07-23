import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiBookOpen } from "react-icons/fi";
import { TbPlus } from "react-icons/tb";
import { Skeleton } from "../components/Skeleton";

type SortDirection = "asc" | "desc";

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ id: "", title: "", teacher_id: "" });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicForm, setTopicForm] = useState({ id: "", title: "", order_index: "" });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const meRes = await Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") });
        setRole(meRes.data.role);

        const coursesRes = await api.get("/courses");
        setCourses(coursesRes.data);

        if (meRes.data.role === "admin") {
          const teachersRes = await api.get("/teachers");
          setTeachers(teachersRes.data);
        }
      } catch {
        setError("No se pudieron cargar los datos.");
      } finally {
        setInitialLoading(false);
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
      const res = await api.get(`/courses/${courseId}/topics`);
      setTopics(res.data);
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (topicForm.id) {
        await api.put(`/topics/${topicForm.id}`, topicForm);
      } else {
        await api.post(`/topics`, { ...topicForm, course_id: selectedCourse.id });
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
      await api.delete(`/topics/${id}`);
      loadTopics(selectedCourse.id);
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (form.id) {
        await api.put(`/courses/${form.id}`, form);
      } else {
        await api.post(`/courses`, form);
      }
      const updated = await api.get("/courses");
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
      await api.delete(`/courses/${id}`);
      setCourses(courses.filter(c => c.id !== id));
    } catch {
      setError("No se pudo eliminar el curso.");
    }
  };

  if (initialLoading) {
    return (
        <div className="page-container">
            <Skeleton width="180px" height="1.8rem" />
            <Skeleton width="160px" height="1.1rem" style={{ marginTop: "8px" }} />
            <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: "1rem" }}>
                            <Skeleton height="1rem" style={{ flex: 2 }} />
                            <Skeleton height="1rem" style={{ flex: 2 }} />
                            <Skeleton width="70px" height="1.8rem" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  if (error) return <p>{error}</p>;

  return (
    <div className="page-container">
      <h1><span className="page-title-icon"><FiBookOpen /></span> Cursos</h1>
      <h2 className="dashboard-subtitle"> {role === "admin" ? <><TbPlus /> Agregar</> : "Disponibles"}</h2>
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
          <div className="form-group full-width">
            <button type="submit" className="btn primary">{form.id ? "Actualizar" : "Agregar"}</button>
            {(form.id || form.title || form.teacher_id) && (
              <button type="button" onClick={() => setForm({ id: "", title: "", teacher_id: "" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
            )}
          </div>
        </form>
      )}

      <div className="table-container">
        <table >
          <thead>
            <tr>
              <th onClick={() => handleSort("title")} className="sortable-header">
                Título
                <span className="sort-icon">
                  {sortConfig?.key === "title" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>

              <th onClick={() => handleSort("teacher_name")} className="sortable-header">
                Maestro
                <span className="sort-icon">
                  {sortConfig?.key === "teacher_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>

              {role === "admin" && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {sortedCourses.map(c => (
              <tr key={c.id}>
                <td
                  onClick={() => handleCourseClick(c)}
                  className="extracted-style-20"
                >
                  {c.title}
                </td>

                <td>{c.teacher_name || "No asignado"}</td>

                {role === "admin" && (
                  <td>
                    <button className="btn secondary extracted-style-4"
                      onClick={() =>
                        setForm({
                          id: c.id,
                          title: c.title,
                          teacher_id: c.teacher_id || ""
                        })
                      }
                      aria-label="Editar"
                    >
                      <IoCreateOutline />
                    </button>

                    <button
                      onClick={() => handleDelete(c.id)}
                      className="btn secondary extracted-style-5"
                      aria-label="Eliminar"
                    >
                      <IoTrashOutline />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {selectedCourse && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setSelectedCourse(null)} title="Cerrar" />
            <h3>Temas: {selectedCourse.title}</h3>

            {role === "admin" && (
              <form onSubmit={handleTopicSubmit} className="modal-form-row">
                <input placeholder="Nuevo Tema" value={topicForm.title}
                  onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} required />
                <input type="number" placeholder="Orden" value={topicForm.order_index}
                  onChange={e => setTopicForm({ ...topicForm, order_index: e.target.value })} required />
                <button type="submit" className="btn primary">{topicForm.id ? "OK" : "＋"}</button>
                {topicForm.id && <button type="button" onClick={() => setTopicForm({ id: "", title: "", order_index: "" })}>X</button>}
              </form>
            )}

            {loadingTopics ? <Skeleton height="1rem" /> : (
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
                          <button className="btn secondary extracted-style-4" onClick={() => setTopicForm({ id: t.id, title: t.title, order_index: t.order_index })} aria-label="Editar"><IoCreateOutline /></button>
                          <button className="btn secondary extracted-style-5" onClick={() => handleTopicDelete(t.id)} aria-label="Eliminar"><IoTrashOutline /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
