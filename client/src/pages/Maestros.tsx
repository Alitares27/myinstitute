import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import {
  IoSchoolOutline,
  IoPersonOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoBookOutline,
  IoPrintOutline,
  IoSearchOutline,
  IoCheckmarkCircleOutline,
  IoWarningOutline,
  IoAddOutline,
  IoCloseOutline,
} from "react-icons/io5";
import { TbChalkboard, TbBooks } from "react-icons/tb";
import { Skeleton } from "../components/Esqueleto";
import { openPrintWindow } from "../utils/utilidadesReportes";
import type { SortConfig } from "../interfaces/Common";
import "../styles/Maestros.css";

interface CourseItem {
  id: number;
  title: string;
  description?: string;
  teacher_id?: number | null;
  teacher_name?: string;
}

interface TeacherItem {
  id: number;
  user_id: number;
  name: string;
  email: string;
  telefono?: string;
  role: string;
  specialty: string;
  created_at?: string;
  courses: Array<{ id: number; title: string; description?: string }>;
}

export default function Maestros() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [form, setForm] = useState<{
    id: string;
    user_id: string;
    name: string;
    specialty: string;
    selectedCourses: number[];
  }>({
    id: "",
    user_id: "",
    name: "",
    specialty: "",
    selectedCourses: [],
  });

  const [courseSearch, setCourseSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  const [quickTeacher, setQuickTeacher] = useState<TeacherItem | null>(null);
  const [quickSelectedCourses, setQuickSelectedCourses] = useState<number[]>([]);
  const [savingQuickCourses, setSavingQuickCourses] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userRes = JSON.parse(localStorage.getItem("user") || "{}");
      setRole(userRes.role || "");
      setUserId(userRes.id || "");

      const [teachersRes, usersRes, coursesRes] = await Promise.all([
        api.get("/teachers"),
        api.get("/users"),
        api.get("/courses"),
      ]);

      setTeachers(teachersRes.data || []);
      setUsers(usersRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error("Error al cargar datos de maestros:", err);
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = useMemo(() => {
    const teacherUserIds = new Set(teachers.map((t) => Number(t.user_id)));
    return users.filter((u) => !teacherUserIds.has(Number(u.id)) || Number(u.id) === Number(form.user_id));
  }, [users, teachers, form.user_id]);

  const uniqueSpecialties = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.specialty?.trim()) set.add(t.specialty.trim());
    });
    return Array.from(set);
  }, [teachers]);

  const visibleFormCourses = useMemo(() => {
    if (!courseSearch.trim()) return courses;
    const q = courseSearch.toLowerCase();
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, courseSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id && !form.id) {
      alert("Por favor selecciona un miembro.");
      return;
    }

    try {
      if (form.id) {
        const res = await api.put(`/teachers/${form.id}`, {
          specialty: form.specialty,
          course_ids: form.selectedCourses,
        });

        setTeachers((prev) =>
          prev.map((t) => (t.id === Number(form.id) ? { ...t, ...res.data } : t))
        );
        await loadData();
        alert("Maestro actualizado exitosamente.");
      } else {
        const res = await api.post("/teachers", {
          user_id: form.user_id,
          specialty: form.specialty || "General",
          course_ids: form.selectedCourses,
        });

        setTeachers((prev) => [...prev, res.data]);
        await loadData();
        alert("Maestro asignado correctamente.");
      }

      resetForm();
    } catch (err: any) {
      console.error("Error en submit maestro:", err);
      alert(err.response?.data?.message || "Error al procesar la solicitud.");
    }
  };

  const resetForm = () => {
    setForm({
      id: "",
      user_id: "",
      name: "",
      specialty: "",
      selectedCourses: [],
    });
    setCourseSearch("");
  };

  const handleEdit = (teacher: TeacherItem) => {
    const courseIds = (teacher.courses || []).map((c) => c.id);
    setForm({
      id: String(teacher.id),
      user_id: String(teacher.user_id),
      name: teacher.name,
      specialty: teacher.specialty || "",
      selectedCourses: courseIds,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al maestro "${name}"? Sus cursos asignados quedarán liberados.`)) {
      return;
    }

    try {
      await api.delete(`/teachers/${id}`);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      await loadData();
      if (form.id === String(id)) {
        resetForm();
      }
    } catch (err: any) {
      console.error("Error al eliminar maestro:", err);
      alert(err.response?.data?.message || "Error al eliminar maestro.");
    }
  };

  const toggleFormCourse = (courseId: number) => {
    setForm((prev) => {
      const exists = prev.selectedCourses.includes(courseId);
      return {
        ...prev,
        selectedCourses: exists
          ? prev.selectedCourses.filter((id) => id !== courseId)
          : [...prev.selectedCourses, courseId],
      };
    });
  };

  const openQuickAssign = (teacher: TeacherItem) => {
    setQuickTeacher(teacher);
    setQuickSelectedCourses((teacher.courses || []).map((c) => c.id));
  };

  const toggleQuickCourse = (courseId: number) => {
    setQuickSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const saveQuickCourses = async () => {
    if (!quickTeacher) return;
    setSavingQuickCourses(true);
    try {
      const res = await api.put(`/teachers/${quickTeacher.id}`, {
        specialty: quickTeacher.specialty,
        course_ids: quickSelectedCourses,
      });

      setTeachers((prev) =>
        prev.map((t) => (t.id === quickTeacher.id ? { ...t, ...res.data } : t))
      );
      await loadData();
      setQuickTeacher(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al actualizar cursos asignados.");
    } finally {
      setSavingQuickCourses(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.specialty?.toLowerCase().includes(q) ||
          t.courses?.some((c) => c.title.toLowerCase().includes(q))
      );
    }

    if (filterSpecialty) {
      result = result.filter((t) => t.specialty === filterSpecialty);
    }

    if (filterCourse) {
      const cId = Number(filterCourse);
      result = result.filter((t) => t.courses?.some((c) => c.id === cId));
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof TeacherItem] || "";
        let bVal: any = b[sortConfig.key as keyof TeacherItem] || "";

        if (sortConfig.key === "courses_count") {
          aVal = a.courses?.length || 0;
          bVal = b.courses?.length || 0;
        }

        if (typeof aVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [teachers, searchQuery, filterSpecialty, filterCourse, sortConfig]);

  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const coursesWithTeacher = courses.filter((c) => c.teacher_id).length;
    const coursesWithoutTeacher = courses.length - coursesWithTeacher;
    const specialtiesCount = uniqueSpecialties.length;

    return {
      totalTeachers,
      coursesWithTeacher,
      coursesWithoutTeacher,
      specialtiesCount,
    };
  }, [teachers, courses, uniqueSpecialties]);

  const totalPages = Math.ceil(filteredTeachers.length / recordsPerPage) || 1;
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredTeachers.slice(start, start + recordsPerPage);
  }, [filteredTeachers, currentPage, recordsPerPage]);

  const requestSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev && prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handlePrintReport = () => {
    const html = `
      <h2>Reporte de Maestros y Cursos Asignados</h2>
      <p class="date-header">Fecha: ${new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Maestro</th>
            <th>Email / Contacto</th>
            <th>Especialidad</th>
            <th>Cursos que Dicta</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTeachers
        .map(
          (t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${t.name}</strong></td>
              <td>${t.email || "-"}${t.telefono ? ` (${t.telefono})` : ""}</td>
              <td>${t.specialty || "-"}</td>
              <td>${t.courses && t.courses.length > 0
              ? t.courses.map((c) => c.title).join(", ")
              : "<em>Sin cursos asignados</em>"
            }</td>
            </tr>
          `
        )
        .join("")}
        </tbody>
      </table>
      <div style="margin-top: 20px; font-size: 0.9em; color: #555;">
        <p>Total de Maestros: ${filteredTeachers.length}</p>
        <p>Total de Asignaciones de Cursos: ${filteredTeachers.reduce(
          (acc, t) => acc + (t.courses?.length || 0),
          0
        )}</p>
      </div>
    `;
    openPrintWindow(
      "Reporte de Maestros",
      "Listado general y cursos asignados",
      html
    );
  };

  if (loading) {
    return (
      <div className="maestros-page page-container">
        <Skeleton width="220px" height="2rem" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1.5rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="80px" />
          ))}
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Skeleton height="160px" />
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Skeleton height="300px" />
        </div>
      </div>
    );
  }

  return (
    <div className="maestros-page page-container">
      <div className="maestros-header">
        <div className="maestros-header-info">
          <h1>
            <span className="page-title-icon">
              <IoSchoolOutline />
            </span>
            Maestros
          </h1>
          <p>Asigna miembros como maestros y gestiona los cursos que dictan</p>
        </div>

        <div className="maestros-header-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={handlePrintReport}
            title="Imprimir o Exportar Reporte"
          >
            <IoPrintOutline /> Imprimir
          </button>
        </div>
      </div>

      <div className="maestros-stats-grid">
        <div className="maestro-stat-card">
          <div className="maestro-stat-icon blue">
            <TbChalkboard />
          </div>
          <div className="maestro-stat-content">
            <h3>{stats.totalTeachers}</h3>
            <p>Maestros Registrados</p>
          </div>
        </div>

        <div className="maestro-stat-card">
          <div className="maestro-stat-icon green">
            <TbBooks />
          </div>
          <div className="maestro-stat-content">
            <h3>{stats.coursesWithTeacher}</h3>
            <p>Cursos con Maestro</p>
          </div>
        </div>

        <div className="maestro-stat-card">
          <div className="maestro-stat-icon orange">
            <IoWarningOutline />
          </div>
          <div className="maestro-stat-content">
            <h3>{stats.coursesWithoutTeacher}</h3>
            <p>Cursos Sin Maestro</p>
          </div>
        </div>

        <div className="maestro-stat-card">
          <div className="maestro-stat-icon purple">
            <IoSchoolOutline />
          </div>
          <div className="maestro-stat-content">
            <h3>{stats.specialtiesCount}</h3>
            <p>Especialidades</p>
          </div>
        </div>
      </div>

      {role === "admin" && (
        <div className="maestro-form-card">
          <div className="maestro-form-header">
            <h2>
              {form.id ? (
                <>
                  <IoCreateOutline /> Editar Maestro
                </>
              ) : (
                <>
                  <IoAddOutline /> Asignar Miembro como Maestro
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
            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px", display: "block", color: "var(--text-secondary)" }}>
                  Miembro:
                </label>
                {form.id ? (
                  <input
                    value={form.name}
                    readOnly
                    style={{ background: "var(--bg-body)", cursor: "not-allowed" }}
                  />
                ) : (
                  <select
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar Miembro --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px", display: "block", color: "var(--text-secondary)" }}>
                  Especialidad:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Instituto, Doctrina del Evangelio, Seminario..."
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  list="specialty-suggestions"
                  required
                />
                <datalist id="specialty-suggestions">
                  <option value="Instituto" />
                  <option value="Quorum de Elderes" />
                  <option value="Sociedad de Socorro" />
                </datalist>
              </div>
            </div>

            <div className="course-selection-box">
              <div className="course-selection-header">
                <span>
                  <IoBookOutline style={{ verticalAlign: "middle", marginRight: "4px" }} />
                  Cursos que dictará el maestro ({form.selectedCourses.length} seleccionados):
                </span>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Buscar curso..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    style={{
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                    }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                    onClick={() =>
                      setForm({
                        ...form,
                        selectedCourses:
                          form.selectedCourses.length === courses.length
                            ? []
                            : courses.map((c) => c.id),
                      })
                    }
                  >
                    {form.selectedCourses.length === courses.length
                      ? "Desmarcar Todos"
                      : "Seleccionar Todos"}
                  </button>
                </div>
              </div>

              {courses.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.5rem 0" }}>
                  No hay cursos registrados en el sistema. Puedes registrarlos en la sección de Matrículas.
                </p>
              ) : (
                <div className="course-badges-grid">
                  {visibleFormCourses.map((course) => {
                    const isSelected = form.selectedCourses.includes(course.id);
                    const isAssignedToOther =
                      course.teacher_id &&
                      course.teacher_id !== Number(form.id) &&
                      course.teacher_name;

                    return (
                      <label
                        key={course.id}
                        className={`course-badge-item ${isSelected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFormCourse(course.id)}
                        />
                        <div className="course-badge-info">
                          <span className="course-badge-title">{course.title}</span>
                          <span className="course-badge-sub">
                            {isSelected
                              ? "✓ Dictará este curso"
                              : isAssignedToOther
                                ? `Actual: ${course.teacher_name}`
                                : "Disponible"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              {form.id && (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn primary">
                {form.id ? "Guardar Cambios" : "Asignar Maestro"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="maestros-toolbar">
        <div className="maestros-search-container">
          <IoSearchOutline style={{ color: "var(--text-muted)", fontSize: "1.1rem" }} />
          <input
            type="text"
            placeholder="Buscar por nombre, email, especialidad o curso..."
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

        <div className="maestros-filters">
          <select
            value={filterSpecialty}
            onChange={(e) => {
              setFilterSpecialty(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todas las especialidades</option>
            {uniqueSpecialties.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>

          <select
            value={filterCourse}
            onChange={(e) => {
              setFilterCourse(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={recordsPerPage}
            onChange={(e) => {
              setRecordsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            title="Registros por página"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sortable-header" onClick={() => requestSort("name")}>
                Maestro {sortConfig?.key === "name" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              <th className="sortable-header" onClick={() => requestSort("specialty")}>
                Especialidad {sortConfig?.key === "specialty" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              <th className="sortable-header" onClick={() => requestSort("courses_count")}>
                Cursos Dictados {sortConfig?.key === "courses_count" && (sortConfig.direction === "asc" ? "▲" : "▼")}
              </th>
              {role === "admin" && <th style={{ textAlign: "right" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedTeachers.length > 0 ? (
              paginatedTeachers.map((teacher) => {
                const initials = teacher.name
                  ? teacher.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                  : "M";

                return (
                  <tr key={teacher.id}>
                    <td>
                      <div className="teacher-profile-cell">
                        <div className="teacher-avatar-circle">{initials}</div>
                        <div className="teacher-details">
                          <span className="teacher-name">{teacher.name}</span>
                          <span className="teacher-contact">
                            {teacher.email}
                            {teacher.telefono ? ` • ${teacher.telefono}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="specialty-badge">
                        {teacher.specialty || "General"}
                      </span>
                    </td>

                    <td>
                      {teacher.courses && teacher.courses.length > 0 ? (
                        <div className="courses-pills-list">
                          {teacher.courses.map((course) => (
                            <span key={course.id} className="course-pill" title={course.title}>
                              <IoBookOutline /> {course.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="course-pill-empty">
                          Sin cursos asignados
                        </span>
                      )}
                    </td>

                    {role === "admin" && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          <button
                            className="btn secondary extracted-style-4"
                            onClick={() => openQuickAssign(teacher)}
                            title="Asignar / Gestionar cursos dictados"
                            aria-label="Gestionar Cursos"
                          >
                            <IoBookOutline />
                          </button>
                          <button
                            className="btn secondary extracted-style-4"
                            onClick={() => handleEdit(teacher)}
                            title="Editar maestro"
                            aria-label="Editar"
                          >
                            <IoCreateOutline />
                          </button>
                          <button
                            className="btn secondary extracted-style-5"
                            onClick={() => handleDelete(teacher.id, teacher.name)}
                            title="Eliminar maestro"
                            aria-label="Eliminar"
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
                <td colSpan={role === "admin" ? 4 : 3} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                  <IoSchoolOutline style={{ fontSize: "2.5rem", marginBottom: "0.5rem", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "1rem" }}>
                    {searchQuery || filterSpecialty || filterCourse
                      ? "No se encontraron maestros con los filtros aplicados."
                      : "No hay maestros registrados actualmente."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Mostrando {paginatedTeachers.length} de {filteredTeachers.length} maestros (Página {currentPage} de {totalPages})
          </span>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              className="btn secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem" }}
            >
              Anterior
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn ${page === currentPage ? "primary" : "secondary"}`}
                onClick={() => setCurrentPage(page)}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.85rem", minWidth: "34px" }}
              >
                {page}
              </button>
            ))}

            <button
              className="btn secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem" }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {quickTeacher && (
        <div className="course-modal-overlay" onClick={() => setQuickTeacher(null)}>
          <div className="course-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="course-modal-header">
              <div>
                <h3>Gestionar Cursos Dictados</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Maestro: <strong>{quickTeacher.name}</strong> ({quickTeacher.specialty || "General"})
                </p>
              </div>
              <button
                className="btn cancel-btn"
                onClick={() => setQuickTeacher(null)}
                style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}
              >
                <IoCloseOutline />
              </button>
            </div>

            <div className="course-modal-body">
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Selecciona los cursos que dictará este maestro. Un maestro puede dictar múltiples cursos a la vez:
              </p>

              <div className="course-badges-grid" style={{ maxHeight: "300px" }}>
                {courses.map((c) => {
                  const isChecked = quickSelectedCourses.includes(c.id);
                  const isAssignedOther =
                    c.teacher_id && c.teacher_id !== quickTeacher.id && c.teacher_name;

                  return (
                    <label
                      key={c.id}
                      className={`course-badge-item ${isChecked ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleQuickCourse(c.id)}
                      />
                      <div className="course-badge-info">
                        <span className="course-badge-title">{c.title}</span>
                        <span className="course-badge-sub">
                          {isChecked
                            ? "✓ Dictando este curso"
                            : isAssignedOther
                              ? `Dictado por: ${c.teacher_name}`
                              : "Disponible"}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="course-modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setQuickTeacher(null)}
                disabled={savingQuickCourses}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={saveQuickCourses}
                disabled={savingQuickCourses}
              >
                {savingQuickCourses ? "Guardando..." : "Guardar Cursos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
