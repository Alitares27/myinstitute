import { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
  IoCreateOutline,
  IoTrashOutline,
  IoSearchOutline,
  IoPrintOutline,
  IoAddOutline,
  IoCloseOutline,
  IoPeopleOutline,
  IoSchoolOutline,
  IoClipboardOutline,
} from "react-icons/io5";
import { TbBooks, TbList, TbCertificate } from "react-icons/tb";
import { Skeleton } from "../components/Esqueleto";
import { openPrintWindow } from "../utils/utilidadesReportes";
import type { SortConfig } from "../interfaces/Common";
import "../styles/Inscripciones.css";

const ITEMS_PER_PAGE = 7;

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: "",
    student_id: "",
    course_id: "",
  });

  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "student_name", direction: "asc" });

  const [showCursosModal, setShowCursosModal] = useState(false);
  const [cursoTitle, setCursoTitle] = useState("");
  const [editingCursoId, setEditingCursoId] = useState<number | null>(null);
  const [cursoError, setCursoError] = useState<string | null>(null);

  const [selectedCurso, setSelectedCurso] = useState<any | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: "", description: "", order_index: "" });
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(user.role || "");
      setUserId(user.id || "");

      const [enRes, stRes, crRes] = await Promise.all([
        api.get("/enrollments"),
        api.get("/students"),
        api.get("/courses"),
      ]);

      setEnrollments(enRes.data || []);
      setStudents(stRes.data || []);
      setCourses(crRes.data || []);
    } catch {
      console.error("Error al cargar datos de matrículas");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const stats = useMemo(() => {
    const totalEnrollments = enrollments.length;
    const uniqueStudents = new Set(enrollments.map((e) => Number(e.student_id))).size;
    const activeCourses = new Set(enrollments.map((e) => Number(e.course_id))).size;
    const totalCourses = courses.length;

    return {
      totalEnrollments,
      uniqueStudents,
      activeCourses,
      totalCourses,
    };
  }, [enrollments, courses]);

  const filteredEnrollments = useMemo(() => {
    let data =
      role === "student"
        ? enrollments.filter((e) => String(e.student_id) === String(userId))
        : enrollments;

    if (studentFilter) {
      data = data.filter((e) => String(e.student_id) === String(studentFilter));
    }

    if (courseFilter) {
      data = data.filter((e) => String(e.course_id) === String(courseFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((e) => {
        const student = students.find((s) => s.id === e.student_id);
        const course = courses.find((c) => c.id === e.course_id);
        const studentName = (student?.name || "").toLowerCase();
        const studentEmail = (student?.email || "").toLowerCase();
        const courseTitle = (course?.title || "").toLowerCase();
        return studentName.includes(q) || studentEmail.includes(q) || courseTitle.includes(q);
      });
    }

    return data;
  }, [enrollments, role, userId, studentFilter, courseFilter, searchQuery, students, courses]);

  const sortedEnrollments = useMemo(() => {
    if (!sortConfig) return filteredEnrollments;

    const { key, direction } = sortConfig;

    return [...filteredEnrollments].sort((a, b) => {
      let aValue: any = a[key];
      let bValue: any = b[key];

      if (key === "student_name" || key === "student_id") {
        aValue = students.find((s) => s.id === a.student_id)?.name || "";
        bValue = students.find((s) => s.id === b.student_id)?.name || "";
      } else if (key === "course_title" || key === "course_id") {
        aValue = courses.find((c) => c.id === a.course_id)?.title || "";
        bValue = courses.find((c) => c.id === b.course_id)?.title || "";
      }

      if (typeof aValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredEnrollments, sortConfig, students, courses]);

  const totalPages = Math.ceil(sortedEnrollments.length / ITEMS_PER_PAGE) || 1;
  const paginatedEnrollments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedEnrollments.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedEnrollments, currentPage]);

  const resetForm = () => {
    setForm({ id: "", student_id: "", course_id: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id) {
      alert("Por favor selecciona un estudiante y un curso.");
      return;
    }

    try {
      if (form.id) {
        const res = await api.put(`/enrollments/${form.id}`, {
          student_id: form.student_id,
          course_id: form.course_id,
        });
        setEnrollments((prev) => prev.map((e) => (e.id === form.id ? res.data : e)));
        resetForm();
        alert("Matrícula actualizada exitosamente.");
      } else {
        const res = await api.post("/enrollments", {
          student_id: form.student_id,
          course_id: form.course_id,
        });
        setEnrollments((prev) => [...prev, res.data]);
        resetForm();
        alert("Matrícula registrada exitosamente.");
      }
    } catch {
      alert("No se pudo procesar la matrícula. Es posible que el miembro ya esté matriculado en este curso.");
    }
  };

  const handleEdit = (en: any) => {
    setForm({
      id: en.id,
      student_id: String(en.student_id),
      course_id: String(en.course_id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("¿Seguro que deseas eliminar esta matrícula?")) return;
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
    try {
      if (editingCursoId !== null) {
        const res = await api.put(`/courses/${editingCursoId}`, { title: cursoTitle.trim() });
        setCourses((prev) => prev.map((c) => (c.id === editingCursoId ? { ...c, ...res.data } : c)));
      } else {
        const res = await api.post("/courses", { title: cursoTitle.trim() });
        setCourses((prev) => [...prev, res.data].sort((a, b) => a.title.localeCompare(b.title)));
      }
      setCursoTitle("");
      setEditingCursoId(null);
      setCursoError(null);
    } catch {
      setCursoError("Error al guardar el curso");
    }
  };

  const handleEditCurso = (c: any) => {
    setEditingCursoId(c.id);
    setCursoTitle(c.title);
    setCursoError(null);
  };

  const handleDeleteCurso = async (id: number) => {
    if (!confirm("¿Eliminar este curso? Se cancelarán las matrículas asociadas.")) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      setEnrollments((prev) => prev.filter((e) => Number(e.course_id) !== id));
    } catch {
      setCursoError("Error al eliminar el curso");
    }
  };

  const loadTopics = async (courseId: number) => {
    setLoadingTopics(true);
    setTopicError(null);
    try {
      const res = await api.get(`/courses/${courseId}/topics`);
      setTopics(res.data || []);
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
        setTopics((prev) => prev.map((t) => (t.id === editingTopicId ? { ...t, ...res.data } : t)));
      } else {
        const res = await api.post("/topics", {
          course_id: selectedCurso.id,
          title: topicForm.title.trim(),
          description: topicForm.description.trim(),
          order_index: topicForm.order_index ? Number(topicForm.order_index) : 0,
        });
        setTopics((prev) => [...prev, res.data]);
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
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setTopicError("Error al eliminar el tema");
    }
  };

  const handlePrintEnrollmentsReport = () => {
    const relevantCourses = courseFilter
      ? courses.filter((c) => String(c.id) === String(courseFilter))
      : courses;

    const relevantEnrollments = filteredEnrollments;
    const allUniqueStudentIds = new Set<number>();
    let hasData = false;
    let body = "";

    relevantCourses.forEach((course) => {
      const courseEnrollments = relevantEnrollments.filter((e) => Number(e.course_id) === Number(course.id));
      if (courseEnrollments.length === 0) return;
      hasData = true;

      const courseStudents = courseEnrollments
        .map((e) => Number(e.student_id))
        .filter((id, idx, arr) => arr.indexOf(id) === idx)
        .sort((a, b) => {
          const nameA = students.find((s) => s.id === a)?.name || "";
          const nameB = students.find((s) => s.id === b)?.name || "";
          return nameA.localeCompare(nameB);
        });

      courseStudents.forEach((id) => allUniqueStudentIds.add(id));

      body += `
        <h2 style="margin-top: 24px; color: #0056cc;">${course.title} ${course.teacher_name ? `<span style="font-size: 0.8em; color: #666; font-weight: normal;">(Maestro: ${course.teacher_name})</span>` : ""}</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Nombre del Alumno</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
      `;

      courseStudents.forEach((studentId, idx) => {
        const student = students.find((s) => s.id === studentId);
        const studentName = student?.name || "Desconocido";
        const studentContact = student?.email || student?.telefono || "-";
        body += `
          <tr>
            <td class="center">${idx + 1}</td>
            <td><strong>${studentName}</strong></td>
            <td>${studentContact}</td>
          </tr>
        `;
      });

      body += `</tbody></table>`;
    });

    if (hasData) {
      body += `
        <div class="summary-box" style="margin-top: 20px;">
          🎓 <strong>Total general de miembros matriculados:</strong> ${allUniqueStudentIds.size} &nbsp;|&nbsp; <strong>Total de asignaciones:</strong> ${relevantEnrollments.length}
        </div>
      `;
    } else {
      body += `<p style="text-align: center; color: #666; margin-top: 20px;">No hay matrículas registradas para los filtros seleccionados.</p>`;
    }

    const courseObj = courses.find((c) => String(c.id) === String(courseFilter));
    const subtitle = courseObj ? `Curso: ${courseObj.title}` : "Todos los Cursos";

    openPrintWindow(
      "Reporte de Matrículas",
      subtitle,
      body
    );
  };

  const getStudentAvatar = (name: string, index: number) => {
    const initial = (name || "E").charAt(0).toUpperCase();
    const gradientClass = index % 3 === 1 ? "gradient-2" : index % 3 === 2 ? "gradient-3" : "";
    return <div className={`student-avatar-circle ${gradientClass}`}>{initial}</div>;
  };

  if (loading) {
    return (
      <div className="inscripciones-page">
        <Skeleton width="220px" height="2rem" />
        <Skeleton width="340px" height="1.1rem" style={{ marginTop: "8px", marginBottom: "1.5rem" }} />
        <div className="inscripciones-stats-grid">
          <Skeleton height="85px" />
          <Skeleton height="85px" />
          <Skeleton height="85px" />
          <Skeleton height="85px" />
        </div>
        <Skeleton height="140px" style={{ marginTop: "1.5rem", borderRadius: "12px" }} />
        <div style={{ marginTop: "2rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="50px" style={{ marginBottom: "8px" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inscripciones-page">
      <div className="inscripciones-header">
        <div className="inscripciones-header-info">
          <h1>
            <IoClipboardOutline /> Matrículas
          </h1>
          <p>Gestión académica y asignación de miembros a cursos activos del instituto</p>
        </div>

        <div className="inscripciones-header-actions">
          {role === "admin" && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowCursosModal(true)}
            >
              <TbList /> Administrar Cursos
            </button>
          )}

          <button
            type="button"
            className="btn primary"
            onClick={handlePrintEnrollmentsReport}
          >
            <IoPrintOutline /> Imprimir
          </button>
        </div>
      </div>

      <div className="inscripciones-stats-grid">
        <div className="inscripcion-stat-card">
          <div className="inscripcion-stat-icon blue">
            <IoClipboardOutline />
          </div>
          <div className="inscripcion-stat-content">
            <h3>{stats.totalEnrollments}</h3>
            <p>Matrículas Activas</p>
          </div>
        </div>

        <div className="inscripcion-stat-card">
          <div className="inscripcion-stat-icon green">
            <IoPeopleOutline />
          </div>
          <div className="inscripcion-stat-content">
            <h3>{stats.uniqueStudents}</h3>
            <p>Alumnos Matriculados</p>
          </div>
        </div>

        <div className="inscripcion-stat-card">
          <div className="inscripcion-stat-icon orange">
            <TbBooks />
          </div>
          <div className="inscripcion-stat-content">
            <h3>{stats.activeCourses}</h3>
            <p>Cursos con Alumnos</p>
          </div>
        </div>

        <div className="inscripcion-stat-card">
          <div className="inscripcion-stat-icon purple">
            <IoSchoolOutline />
          </div>
          <div className="inscripcion-stat-content">
            <h3>{stats.totalCourses}</h3>
            <p>Cursos Disponibles</p>
          </div>
        </div>
      </div>

      {role === "admin" && (
        <div className="inscripcion-form-card">
          <div className="inscripcion-form-header">
            <h2>
              {form.id ? (
                <>
                  <IoCreateOutline /> Editar Matrícula
                </>
              ) : (
                <>
                  <IoAddOutline /> Matricular Miembro en Curso
                </>
              )}
            </h2>
            {form.id && (
              <button
                type="button"
                className="btn cancel-btn"
                onClick={resetForm}
                title="Cancelar edición"
              >
                ✕ Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="inscripcion-form-grid">
              <div className="form-group">
                <label>Estudiante / Miembro:</label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Miembro --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Curso a Asignar:</label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  required
                >
                  <option value="">-- Seleccionar Curso --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inscripcion-form-actions">
                <button type="submit" className="btn primary">
                  {form.id ? "Actualizar" : "Matricular"}
                </button>
                {(form.id || form.student_id || form.course_id) && !form.id && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn cancel-btn"
                    title="Limpiar formulario"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="inscripciones-toolbar">
        <div className="inscripciones-search-container">
          <IoSearchOutline style={{ color: "var(--text-muted)", fontSize: "1.1rem" }} />
          <input
            type="text"
            placeholder="Buscar por estudiante, correo o curso..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              ✕
            </button>
          )}
        </div>

        <div className="inscripciones-filters">
          {role === "admin" && (
            <select
              value={studentFilter}
              onChange={(e) => {
                setStudentFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todos los miembros ({students.length})</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todos los cursos ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("student_name")} className="sortable-header">
                Estudiante / Miembro
                <span className="sort-icon">
                  {sortConfig?.key === "student_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("course_title")} className="sortable-header">
                Curso Asignado
                <span className="sort-icon">
                  {sortConfig?.key === "course_title" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              {role === "admin" && <th style={{ width: "120px", textAlign: "center" }}>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {paginatedEnrollments.length > 0 ? (
              paginatedEnrollments.map((en, index) => {
                const student = students.find((s) => s.id === en.student_id);
                const course = courses.find((c) => c.id === en.course_id);

                return (
                  <tr key={en.id}>
                    <td>
                      <div className="student-profile-cell">
                        {getStudentAvatar(student?.name || "E", index)}
                        <div className="student-details">
                          <span className="student-name">{student?.name || "Miembro sin nombre"}</span>
                          <span className="student-contact">{student?.email || student?.telefono || "Sin contacto registrado"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span className="course-pill-badge">
                          <TbBooks /> {course?.title || "Curso no encontrado"}
                        </span>
                        {course?.teacher_name && (
                          <span className="teacher-tag">
                            <IoSchoolOutline /> {course.teacher_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {role === "admin" && (
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button
                            className="btn secondary extracted-style-4"
                            onClick={() => handleEdit(en)}
                            aria-label="Editar Matrícula"
                            title="Editar Matrícula"
                          >
                            <IoCreateOutline />
                          </button>
                          <button
                            className="btn secondary extracted-style-5"
                            onClick={() => handleDelete(en.id)}
                            aria-label="Eliminar Matrícula"
                            title="Eliminar Matrícula"
                          >
                            <IoTrashOutline />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={role === "admin" ? 3 : 2} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <TbCertificate style={{ fontSize: "2rem", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "0.95rem" }}>No se encontraron matrículas con los criterios especificados.</p>
                  </div>
                </td>
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
              <option key={i + 1} value={i + 1}>
                {i + 1} de {totalPages}
              </option>
            ))}
          </select>
        </div>
      )}

      {showCursosModal && (
        <div className="course-modal-overlay" onClick={() => setShowCursosModal(false)}>
          <div className="course-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="course-modal-header">
              <h3>
                <TbBooks /> Catálogo de Cursos
              </h3>
              <button
                type="button"
                className="btn cancel-btn"
                style={{ padding: "4px 8px", fontSize: "1rem" }}
                onClick={() => setShowCursosModal(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="course-modal-body">
              <form onSubmit={handleAddCurso} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  placeholder={editingCursoId !== null ? "Editar nombre del curso..." : "Nombre del nuevo curso..."}
                  value={cursoTitle}
                  onChange={(e) => setCursoTitle(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn primary">
                  {editingCursoId !== null ? "Guardar" : <><IoAddOutline /> Agregar</>}
                </button>
                {editingCursoId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCursoId(null);
                      setCursoTitle("");
                      setCursoError(null);
                    }}
                    className="btn cancel-btn"
                    title="Cancelar"
                  >
                    ✕
                  </button>
                )}
              </form>

              {cursoError && <div className="error-message" style={{ marginBottom: "0.75rem" }}>{cursoError}</div>}

              <div style={{ maxHeight: "45vh", overflowY: "auto", paddingRight: "4px" }}>
                {courses.length > 0 ? (
                  courses.map((c) => (
                    <div key={c.id} className="course-item-row">
                      <div className="course-item-info">
                        <button
                          type="button"
                          className="course-item-title"
                          onClick={() => handleOpenTopics(c)}
                          title={`Ver y administrar temas de ${c.title}`}
                        >
                          {c.title}
                        </button>
                        <span className="course-item-meta">
                          {c.teacher_name ? `Maestro: ${c.teacher_name}` : "Sin maestro asignado"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          className="btn secondary extracted-style-4"
                          onClick={() => handleEditCurso(c)}
                          aria-label="Editar Curso"
                          title="Editar nombre"
                        >
                          <IoCreateOutline />
                        </button>
                        <button
                          type="button"
                          className="btn secondary extracted-style-5"
                          onClick={() => handleDeleteCurso(c.id)}
                          aria-label="Eliminar Curso"
                          title="Eliminar curso"
                        >
                          <IoTrashOutline />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                    No hay cursos registrados en el sistema.
                  </p>
                )}
              </div>
            </div>

            <div className="course-modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowCursosModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCurso && (
        <div className="course-modal-overlay" onClick={handleCloseTopics}>
          <div className="course-modal-content wide" onClick={(e) => e.stopPropagation()}>
            <div className="course-modal-header">
              <h3>
                <TbList /> Temas: {selectedCurso.title}
              </h3>
              <button
                type="button"
                className="btn cancel-btn"
                style={{ padding: "4px 8px", fontSize: "1rem" }}
                onClick={handleCloseTopics}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="course-modal-body">
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0 0 1rem 0" }}>
                Organiza y registra los capítulos o unidades que se dictarán a los alumnos en este curso.
              </p>

              <form onSubmit={handleTopicSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  placeholder={editingTopicId !== null ? "Editar tema o capítulo..." : "Nuevo tema o capítulo..."}
                  value={topicForm.title}
                  onChange={(e) => setTopicForm((prev) => ({ ...prev, title: e.target.value }))}
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn primary">
                  {editingTopicId !== null ? "Guardar" : <><IoAddOutline /> Agregar</>}
                </button>
                {editingTopicId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTopicId(null);
                      setTopicForm({ title: "", description: "", order_index: "" });
                      setTopicError(null);
                    }}
                    className="btn cancel-btn"
                    title="Cancelar"
                  >
                    ✕
                  </button>
                )}
              </form>

              {topicError && <div className="error-message" style={{ marginBottom: "0.75rem" }}>{topicError}</div>}

              {loadingTopics ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>Cargando temas...</p>
              ) : topics.length > 0 ? (
                <div className="table-container" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Tema / Capítulo</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topics.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.title}</strong></td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "center" }}>
                              <button
                                type="button"
                                className="btn secondary extracted-style-4"
                                onClick={() => handleEditTopic(t)}
                                aria-label="Editar Tema"
                                title="Editar"
                              >
                                <IoCreateOutline />
                              </button>
                              <button
                                type="button"
                                className="btn secondary extracted-style-5"
                                onClick={() => handleDeleteTopic(t.id)}
                                aria-label="Eliminar Tema"
                                title="Eliminar"
                              >
                                <IoTrashOutline />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                  No hay temas registrados para este curso todavía.
                </p>
              )}
            </div>

            <div className="course-modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={handleCloseTopics}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

