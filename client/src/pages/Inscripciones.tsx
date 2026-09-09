import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiEdit } from "react-icons/fi";
import { TbPlus, TbList } from "react-icons/tb";
import { Skeleton } from "../components/Esqueleto";
import { openPrintWindow } from "../utils/utilidadesReportes";
import type { SortDirection } from "../interfaces/Common";

const ITEMS_PER_PAGE = 5;

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    course_id: "",
  });

  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [studentFilter, setStudentFilter] = useState<number | null>(null);
  const [courseFilter, setCourseFilter] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCursosModal, setShowCursosModal] = useState(false);
  const [cursoTitle, setCursoTitle] = useState("");
  const [cursoTeacherId, setCursoTeacherId] = useState("");
  const [editingCursoId, setEditingCursoId] = useState<number | null>(null);
  const [cursoError, setCursoError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [selectedCurso, setSelectedCurso] = useState<any | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: "", description: "", order_index: "" });
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    Promise.resolve({ data: JSON.parse(localStorage.getItem("user") || "{}") }).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    api.get("/enrollments").then((res) => setEnrollments(res.data));
    api.get("/students").then((res) => setStudents(res.data));
    api.get("/courses").then((res) => setCourses(res.data));
    api.get("/teachers").then((res) => setTeachers(res.data)).finally(() => setLoading(false));
  }, []);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const filteredEnrollments = useMemo(() => {
    let data =
      role === "student"
        ? enrollments.filter((e) => e.student_id === userId)
        : enrollments;

    if (role === "admin" && studentFilter !== null) {
      data = data.filter((e) => Number(e.student_id) === studentFilter);
    }

    if (courseFilter !== null) {
      data = data.filter((e) => Number(e.course_id) === courseFilter);
    }

    return data;
  }, [enrollments, role, userId, studentFilter, courseFilter]);

  const sortedEnrollments = useMemo(() => {
    if (!sortConfig) return filteredEnrollments;

    const { key, direction } = sortConfig;

    return [...filteredEnrollments].sort((a, b) => {
      let aValue: any = a[key];
      let bValue: any = b[key];

      if (key === "student_id") {
        aValue = students.find((s) => s.id === a.student_id)?.name || "";
        bValue = students.find((s) => s.id === b.student_id)?.name || "";
      }

      if (key === "course_id") {
        aValue = courses.find((c) => c.id === a.course_id)?.title || "";
        bValue = courses.find((c) => c.id === b.course_id)?.title || "";
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredEnrollments, sortConfig, students, courses]);

  const totalPages = Math.ceil(sortedEnrollments.length / ITEMS_PER_PAGE);
  const paginatedEnrollments = sortedEnrollments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (form.id) {
        const res = await api.put(
          `/enrollments/${form.id}`,
          { student_id: form.student_id, course_id: form.course_id }
        );
        setEnrollments((prev) => prev.map((e) => (e.id === form.id ? res.data : e)));
        setForm({ id: "", student_id: "", course_id: "" });
        alert("Matrícula actualizada correctamente");
        return;
      }
      const res = await api.post("/enrollments", form);
      setEnrollments((prev) => [...prev, res.data]);
      alert("Matrícula registrada correctamente");
      if (confirm("¿Deseas editar el registro recién creado?")) {
        setForm({
          id: res.data.id,
          student_id: res.data.student_id,
          course_id: res.data.course_id,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setForm({ id: "", student_id: "", course_id: "" });
      }
    } catch {
      alert("Error al procesar la matrícula");
    }
  };

  const handleEdit = (en: any) => {
    setForm({
      id: en.id,
      student_id: en.student_id,
      course_id: en.course_id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar matrícula?")) return;
    try {
      await api.delete(`/enrollments/${id}`);
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Error al eliminar la matrícula");
    }
  };

  const handleAddCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoTitle.trim()) return;
    const teacherId = cursoTeacherId ? Number(cursoTeacherId) : null;
    try {
      if (editingCursoId !== null) {
        const res = await api.put(`/courses/${editingCursoId}`, { title: cursoTitle.trim(), teacher_id: teacherId });
        setCourses(prev => prev.map(c => c.id === editingCursoId ? { ...c, ...res.data } : c));
      } else {
        const res = await api.post("/courses", { title: cursoTitle.trim(), teacher_id: teacherId });
        setCourses(prev => [...prev, res.data].sort((a, b) => a.title.localeCompare(b.title)));
      }
      setCursoTitle("");
      setCursoTeacherId("");
      setEditingCursoId(null);
      setCursoError(null);
    } catch {
      setCursoError("Error al guardar el curso");
    }
  };

  const handleEditCurso = (c: any) => {
    setEditingCursoId(c.id);
    setCursoTitle(c.title);
    setCursoTeacherId(c.teacher_id != null ? String(c.teacher_id) : "");
    setCursoError(null);
  };

  const handleDeleteCurso = async (id: number) => {
    if (!confirm("¿Eliminar este curso?")) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
    } catch {
      setCursoError("Error al eliminar el curso");
    }
  };

  const loadTopics = async (courseId: number) => {
    setLoadingTopics(true);
    setTopicError(null);
    try {
      const res = await api.get(`/courses/${courseId}/topics`);
      setTopics(res.data);
    } catch {
      setTopicError("Error al cargar los temas");
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleOpenTopics = (curso: any) => {
    setSelectedCurso(curso);
    setTopicForm({ title: "", description: "", order_index: "" });
    setEditingTopicId(null);
    setTopics([]);
    loadTopics(curso.id);
  };

  const handleCloseTopics = () => {
    setSelectedCurso(null);
    setTopics([]);
    setTopicForm({ title: "", description: "", order_index: "" });
    setEditingTopicId(null);
    setTopicError(null);
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurso || !topicForm.title.trim()) return;
    try {
      if (editingTopicId !== null) {
        const res = await api.put(`/topics/${editingTopicId}`, {
          title: topicForm.title.trim(),
          description: topicForm.description.trim(),
          order_index: topicForm.order_index ? Number(topicForm.order_index) : 0,
        });
        setTopics(prev => prev.map(t => (t.id === editingTopicId ? { ...t, ...res.data } : t)));
      } else {
        const res = await api.post("/topics", {
          course_id: selectedCurso.id,
          title: topicForm.title.trim(),
          description: topicForm.description.trim(),
          order_index: topicForm.order_index ? Number(topicForm.order_index) : 0,
        });
        setTopics(prev => [...prev, res.data]);
      }
      setTopicForm({ title: "", description: "", order_index: "" });
      setEditingTopicId(null);
      setTopicError(null);
    } catch {
      setTopicError("Error al guardar el tema");
    }
  };

  const handleEditTopic = (t: any) => {
    setEditingTopicId(t.id);
    setTopicForm({
      title: t.title || "",
      description: t.description || "",
      order_index: t.order_index != null ? String(t.order_index) : "",
    });
    setTopicError(null);
  };

  const handleDeleteTopic = async (id: number) => {
    if (!confirm("¿Eliminar este tema?")) return;
    try {
      await api.delete(`/topics/${id}`);
      setTopics(prev => prev.filter(t => t.id !== id));
    } catch {
      setTopicError("Error al eliminar el tema");
    }
  };

  const handlePrintEnrollmentsReport = () => {
    const relevantCourses = courseFilter
      ? courses.filter(c => c.id === courseFilter)
      : courses;

    const relevantEnrollments = enrollments.filter(e => {
      if (studentFilter !== null && Number(e.student_id) !== studentFilter) return false;
      if (courseFilter !== null && Number(e.course_id) !== courseFilter) return false;
      return true;
    });

    const allUniqueStudentIds = new Set<number>();
    let hasData = false;
    let body = "";

    relevantCourses.forEach(course => {
      const courseStudents = relevantEnrollments
        .filter(e => Number(e.course_id) === course.id)
        .map(e => Number(e.student_id))
        .filter((id, idx, arr) => arr.indexOf(id) === idx)
        .sort((a, b) => {
          const nameA = students.find(s => s.id === a)?.name || "";
          const nameB = students.find(s => s.id === b)?.name || "";
          return nameA.localeCompare(nameB);
        });

      if (courseStudents.length === 0) return;
      hasData = true;
      courseStudents.forEach(id => allUniqueStudentIds.add(id));

      body += `
        <h2>${course.title}</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre del Alumno</th>
            </tr>
          </thead>
          <tbody>
      `;

      courseStudents.forEach(studentId => {
        const studentName = students.find(s => s.id === studentId)?.name || "Desconocido";
        body += `
            <tr>
              <td>${studentName}</td>
            </tr>
        `;
      });

      body += `</tbody></table>`;
    });

    if (hasData) {
      body += `
        <div class="summary-box">
          🎓 Total general de miembros matriculados: ${allUniqueStudentIds.size}
        </div>
      `;
    } else {
      body += `<p style="text-align: center; color: #666; margin-top: 10px;">No hay matrículas registradas para mostrar.</p>`;
    }

    openPrintWindow(
      "Reporte de Matrículas",
      courseFilter
        ? `Curso: ${courses.find(c => c.id === courseFilter)?.title || ""}`
        : "Todos los cursos",
      body
    );
  };

  if (loading) {
    return (
      <div className="enrollments-page">
        <Skeleton width="200px" height="1.8rem" />
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

  return (
    <div className="enrollments-page">
      <h1><span className="page-title-icon"><FiEdit /></span> Matrículas</h1>

      <h2 className="dashboard-subtitle">{role === "admin" ? <><TbPlus /> Matricular</> : "Revisar"}</h2>
      {role === "admin" && (
        <form onSubmit={handleSubmit} className="enrollment-form">
          <select
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            required
          >
            <option value="">Elegir estudiante</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            required
          >
            <option value="">Elegir curso</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <div className="form-group full-width">
            <button type="submit" className="btn primary">
              {form.id ? "Actualizar" : "Matricular"}
            </button>
            {(form.id || form.student_id || form.course_id) && (
              <button type="button" onClick={() => setForm({ id: "", student_id: "", course_id: "" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
            )}
          </div>
        </form>
      )}

      <div className="grid-form extracted-style-2">
        {role === "admin" && (
          <select
            value={studentFilter ?? ""}
            onChange={(e) =>
              setStudentFilter(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Todos los miembros</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <select
          value={courseFilter ?? ""}
          onChange={(e) =>
            setCourseFilter(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Todos los cursos</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {role === "admin" && (
          <button className="btn secondary" onClick={() => setShowCursosModal(true)}>
            <TbList /> Ver Cursos
          </button>
        )}

        {role === "admin" && (
          <button type="button" onClick={handlePrintEnrollmentsReport} className="btn primary">Imprimir</button>
        )}
      </div>

      <div className="table-container">
        <table
          className="enrollments-table"
        >
          <thead>
            <tr>
              <th onClick={() => handleSort("student_id")} className="sortable-header">
                Estudiante
                <span className="sort-icon">
                  {sortConfig?.key === "student_id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("course_id")} className="sortable-header">
                Curso
                <span className="sort-icon">
                  {sortConfig?.key === "course_id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              {role === "admin" && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {paginatedEnrollments.map((en) => (
              <tr key={en.id}>
                <td>{students.find((s) => s.id === en.student_id)?.name}</td>
                <td>{courses.find((c) => c.id === en.course_id)?.title}</td>

                {role === "admin" && (
                  <td>
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(en)} aria-label="Editar"><IoCreateOutline /></button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(en.id)} aria-label="Eliminar"><IoTrashOutline /></button>
                  </td>
                )}
              </tr>
            ))}
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
      {showCursosModal && (
        <div className="modal-overlay" onClick={() => setShowCursosModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCursosModal(false)} aria-label="Cerrar" />
            <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Cursos</h2>

            <form onSubmit={handleAddCurso} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder={editingCursoId !== null ? "Editar curso..." : "Nuevo curso..."}
                value={cursoTitle}
                onChange={e => setCursoTitle(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <select
                value={cursoTeacherId}
                onChange={e => setCursoTeacherId(e.target.value)}
                style={{ minWidth: "160px" }}
              >
                <option value="">Sin maestro</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="submit" className="btn primary">{editingCursoId !== null ? "Guardar" : <FaPlus />}</button>
              {editingCursoId !== null && (
                <button type="button" onClick={() => { setEditingCursoId(null); setCursoTitle(""); setCursoTeacherId(""); setCursoError(null); }} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
              )}
            </form>

            {cursoError && <div className="error-message" style={{ marginBottom: "0.5rem" }}>{cursoError}</div>}

            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {courses.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {courses.map(c => (
                    <li key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                      <button
                        className="link-button"
                        style={{ textAlign: "left" }}
                        onClick={() => handleOpenTopics(c)}
                        title={`Ver temas de ${c.title}`}
                      >
                        {c.title}
                      </button>
                      <span style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn secondary extracted-style-4" onClick={() => handleEditCurso(c)} aria-label="Editar">
                          <IoCreateOutline />
                        </button>
                        <button className="btn secondary extracted-style-5" onClick={() => handleDeleteCurso(c.id)} aria-label="Eliminar">
                          <IoTrashOutline />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No hay cursos registrados.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedCurso && (
        <div className="modal-overlay" onClick={handleCloseTopics}>
          <div className="modal-content" style={{ maxWidth: "640px" }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseTopics} aria-label="Cerrar" />
            <h2 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Temas de {selectedCurso.title}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9em", marginBottom: "1rem" }}>Haz clic en un tema para editarlo o elimínalo con el botón de la derecha.</p>

            <form onSubmit={handleTopicSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder={editingTopicId !== null ? "Editar tema..." : "Nuevo tema..."}
                value={topicForm.title}
                onChange={e => setTopicForm(prev => ({ ...prev, title: e.target.value }))}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn primary">{editingTopicId !== null ? "Guardar" : <FaPlus />}</button>
              {editingTopicId !== null && (
                <button type="button" onClick={() => { setEditingTopicId(null); setTopicForm({ title: "", description: "", order_index: "" }); setTopicError(null); }} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
              )}
            </form>

            {topicError && <div className="error-message" style={{ marginBottom: "0.5rem" }}>{topicError}</div>}

            {loadingTopics ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Cargando temas...</p>
            ) : topics.length > 0 ? (
              <div className="table-container" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Tema</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>
                          <span style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn secondary extracted-style-4" onClick={() => handleEditTopic(t)} aria-label="Editar">
                              <IoCreateOutline />
                            </button>
                            <button className="btn secondary extracted-style-5" onClick={() => handleDeleteTopic(t.id)} aria-label="Eliminar">
                              <IoTrashOutline />
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No hay temas registrados para este curso.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
