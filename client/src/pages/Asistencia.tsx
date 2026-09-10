import { useEffect, useState, useMemo } from "react";
import api from "../api";
import {
  IoCalendarOutline,
  IoSearchOutline,
  IoPrintOutline,
  IoAddOutline,
  IoCheckmarkCircle,
  IoPeopleOutline,
  IoSchoolOutline,
  IoBookmarkOutline,
  IoCheckmarkDoneOutline,
} from "react-icons/io5";
import { TbBooks } from "react-icons/tb";
import { formatDate, toYMD } from "../utils/utilidadesFecha";
import { openPrintWindow } from "../utils/utilidadesReportes";
import { Skeleton } from "../components/Esqueleto";
import { TbAlertTriangle } from "react-icons/tb";
import type { AttendanceRecord } from "../interfaces/Attendance";
import type { Student, Course, Topic, SortDirection } from "../interfaces/Common";
import "../styles/Asistencia.css";

const ITEMS_PER_PAGE = 7;

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
    date: toYMD(new Date().toISOString()),
    status: "Present",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>({
    key: "date",
    direction: "desc",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No hay sesión activa");
      setLoading(false);
      return;
    }

    try {
      const [userRes, attRes, stdRes, crsRes, topRes] = await Promise.all([
        Promise.resolve({ data: JSON.parse(localStorage.getItem("user") || "{}") }),
        api.get("/attendance"),
        api.get("/students"),
        api.get("/courses"),
        api.get("/topics"),
      ]);

      setRole(userRes.data.role);
      setUserId(userRes.data.id);
      setAttendance(attRes.data || []);
      setStudents(stdRes.data || []);
      setCourses(crsRes.data || []);
      setAllTopics(topRes.data || []);
    } catch {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = useMemo(() => {
    if (!form.course_id) return [];
    return allTopics.filter((t) => t.course_id === Number(form.course_id));
  }, [allTopics, form.course_id]);

  const stats = useMemo(() => {
    const presentRecords = attendance.filter((a) => a.status === "Present");
    const totalPresent = presentRecords.length;
    const uniqueStudents = new Set(presentRecords.map((a) => a.student_id)).size;
    const activeCourses = new Set(presentRecords.map((a) => a.course_id)).size;
    const todayStr = toYMD(new Date().toISOString());
    const todayCount = presentRecords.filter((a) => toYMD(a.date) === todayStr).length;

    return {
      totalPresent,
      uniqueStudents,
      activeCourses,
      todayCount,
    };
  }, [attendance]);

  const filteredAttendance = useMemo(() => {
    let data = attendance.filter((a) => {
      if (role === "student" && a.student_id !== userId) return false;
      if (studentFilter && String(a.student_id) !== String(studentFilter)) return false;
      if (courseFilter && String(a.course_id) !== String(courseFilter)) return false;
      if (dateFilter && toYMD(a.date) !== dateFilter) return false;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((a) => {
        const student = students.find((s) => s.id === a.student_id);
        const course = courses.find((c) => c.id === a.course_id);
        const studentName = (student?.name || "").toLowerCase();
        const courseTitle = (course?.title || "").toLowerCase();
        const topicTitle = (a.topic || "").toLowerCase();
        return studentName.includes(q) || courseTitle.includes(q) || topicTitle.includes(q);
      });
    }

    return data;
  }, [attendance, studentFilter, courseFilter, dateFilter, searchQuery, role, userId, students, courses]);

  const sortedAttendance = useMemo(() => {
    if (!sortConfig) return filteredAttendance;
    const { key, direction } = sortConfig;

    return [...filteredAttendance].sort((a, b) => {
      let aVal: any = a[key as keyof AttendanceRecord];
      let bVal: any = b[key as keyof AttendanceRecord];

      if (key === "student_id" || key === "student_name") {
        aVal = students.find((s) => s.id === a.student_id)?.name || "";
        bVal = students.find((s) => s.id === b.student_id)?.name || "";
      } else if (key === "course_id" || key === "course_title") {
        aVal = courses.find((c) => c.id === a.course_id)?.title || "";
        bVal = courses.find((c) => c.id === b.course_id)?.title || "";
      } else if (key === "date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (typeof aVal === "string") {
        return direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAttendance, sortConfig, students, courses]);

  const totalPages = Math.ceil(sortedAttendance.length / ITEMS_PER_PAGE) || 1;
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAttendance.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAttendance, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.course_id || !form.topic_id) {
      alert("Por favor completa todos los campos requeridos.");
      return;
    }

    try {
      const res = await api.post("/attendance", {
        ...form,
        status: "Present",
      });

      const topic = allTopics.find((t) => t.id === Number(form.topic_id));
      setAttendance((prev) => [
        { ...res.data, topic: topic?.title || "—" },
        ...prev,
      ]);

      setForm({ ...form, student_id: "", topic_id: "", status: "Present" });
      alert("Asistencia registrada exitosamente.");
    } catch {
      setError("Error al registrar asistencia");
    }
  };

  const handlePrintAttendanceReport = () => {
    const presentRecords = attendance.filter((a) => a.status === "Present");

    const countsByCourse = presentRecords.reduce((acc, a) => {
      if (!acc[a.course_id]) acc[a.course_id] = {};
      acc[a.course_id][a.student_id] = (acc[a.course_id][a.student_id] || 0) + 1;
      return acc;
    }, {} as Record<number, Record<number, number>>);

    let body = ``;
    const relevantCourses = courseFilter
      ? courses.filter((c) => String(c.id) === String(courseFilter))
      : courses;

    const allUniqueStudentIds = new Set<number>();
    let hasData = false;

    relevantCourses.forEach((course) => {
      const courseCounts = countsByCourse[course.id];
      if (!courseCounts || Object.keys(courseCounts).length === 0) return;
      hasData = true;

      const courseStudents = Object.keys(courseCounts)
        .map(Number)
        .sort((a, b) => {
          const nameA = students.find((s) => s.id === a)?.name || "";
          const nameB = students.find((s) => s.id === b)?.name || "";
          return nameA.localeCompare(nameB);
        });

      courseStudents.forEach((id) => allUniqueStudentIds.add(id));

      body += `
        <h2 style="margin-top: 24px; color: #0056cc;">${course.title}</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>Nombre del Alumno</th>
              <th class="center" style="width: 180px;">Total Asistencias</th>
            </tr>
          </thead>
          <tbody>
      `;

      courseStudents.forEach((studentId, idx) => {
        const studentName = students.find((s) => s.id === studentId)?.name || "Desconocido";
        const count = courseCounts[studentId];
        body += `
          <tr>
            <td class="center">${idx + 1}</td>
            <td><strong>${studentName}</strong></td>
            <td class="center"><strong style="color: #34c759;">${count}</strong></td>
          </tr>
        `;
      });

      body += `</tbody></table>`;
    });

    if (hasData) {
      body += `
        <div class="summary-box" style="margin-top: 20px;">
          🎓 <strong>Total general de miembros con asistencia:</strong> ${allUniqueStudentIds.size}
        </div>
      `;
    } else {
      body += `<p style="text-align: center; color: #666; margin-top: 20px;">No hay asistencias registradas para los filtros seleccionados.</p>`;
    }

    const courseObj = courses.find((c) => String(c.id) === String(courseFilter));
    const subtitle = courseObj ? `Curso: ${courseObj.title}` : "Todos los Cursos";

    openPrintWindow(
      "Reporte de Asistencias",
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
      <div className="asistencia-page">
        <Skeleton width="240px" height="2rem" />
        <Skeleton width="340px" height="1.1rem" style={{ marginTop: "8px", marginBottom: "1.5rem" }} />
        <div className="asistencia-stats-grid">
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

  if (error) {
    return (
      <div className="error" style={{ margin: "2rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
        <TbAlertTriangle /> {error}
      </div>
    );
  }

  return (
    <div className="asistencia-page">
      <div className="asistencia-header">
        <div className="asistencia-header-info">
          <h1>
            <IoCalendarOutline /> Control de Asistencia
          </h1>
          <p>Registro y seguimiento de asistencia de los miembros a las clases y lecciones</p>
        </div>

        <div className="asistencia-header-actions">
          {(role === "admin" || role === "teacher") && (
            <button
              type="button"
              className="btn primary"
              onClick={handlePrintAttendanceReport}
            >
              <IoPrintOutline /> Imprimir
            </button>
          )}
        </div>
      </div>

      <div className="asistencia-stats-grid">
        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon green">
            <IoCheckmarkDoneOutline />
          </div>
          <div className="asistencia-stat-content">
            <h3>{stats.totalPresent}</h3>
            <p>Asistencias Marcadas</p>
          </div>
        </div>

        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon blue">
            <IoPeopleOutline />
          </div>
          <div className="asistencia-stat-content">
            <h3>{stats.uniqueStudents}</h3>
            <p>Alumnos con Asistencia</p>
          </div>
        </div>

        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon orange">
            <TbBooks />
          </div>
          <div className="asistencia-stat-content">
            <h3>{stats.activeCourses}</h3>
            <p>Cursos Activos</p>
          </div>
        </div>

        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon purple">
            <IoCalendarOutline />
          </div>
          <div className="asistencia-stat-content">
            <h3>{stats.todayCount}</h3>
            <p>Marcadas Hoy</p>
          </div>
        </div>
      </div>

      {(role === "admin" || role === "teacher") && (
        <div className="asistencia-form-card">
          <div className="asistencia-form-header">
            <h2>
              <IoAddOutline /> Registrar Nueva Asistencia
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="asistencia-form-grid">
              <div className="form-group">
                <label>Estudiante / Miembro:</label>
                <select
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                >
                  <option value="">-- Seleccionar Estudiante --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Curso:</label>
                <select
                  required
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value, topic_id: "" })}
                >
                  <option value="">-- Seleccionar Curso --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Capítulo / Tema:</label>
                <select
                  required
                  value={form.topic_id}
                  onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
                  disabled={!form.course_id}
                >
                  <option value="">
                    {form.course_id ? "-- Seleccionar Capítulo --" : "Primero elige un curso"}
                  </option>
                  {filteredTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Fecha:</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="asistencia-form-actions">
                <button type="submit" className="btn primary">
                  Marcar
                </button>
                {(form.student_id || form.topic_id) && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, student_id: "", topic_id: "", status: "Present" })}
                    className="btn cancel-btn"
                    title="Limpiar"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="asistencia-toolbar">
        <div className="asistencia-search-container">
          <IoSearchOutline style={{ color: "var(--text-muted)", fontSize: "1.1rem" }} />
          <input
            type="text"
            placeholder="Buscar por estudiante, curso o capítulo..."
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

        <div className="asistencia-filters">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            title="Filtrar por fecha"
          />

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

          {role !== "student" && (
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
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {role !== "student" && (
                <th onClick={() => handleSort("student_name")} className="sortable-header">
                  Estudiante / Miembro
                  <span className="sort-icon">
                    {sortConfig?.key === "student_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
              )}
              <th onClick={() => handleSort("course_title")} className="sortable-header">
                Curso
                <span className="sort-icon">
                  {sortConfig?.key === "course_title" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("date")} className="sortable-header">
                Fecha
                <span className="sort-icon">
                  {sortConfig?.key === "date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("status")} className="sortable-header">
                Estado
                <span className="sort-icon">
                  {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th>Capítulo / Tema</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.length > 0 ? (
              currentRecords.map((a, index) => {
                const student = students.find((s) => s.id === a.student_id);
                const course = courses.find((c) => c.id === a.course_id);

                return (
                  <tr key={a.id}>
                    {role !== "student" && (
                      <td>
                        <div className="student-profile-cell">
                          {getStudentAvatar(student?.name || "E", index)}
                          <div className="student-details">
                            <span className="student-name">{student?.name || "Miembro sin nombre"}</span>
                            <span className="student-contact">{student?.email || student?.telefono || "Registrado"}</span>
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      <span className="course-pill-badge">
                        <TbBooks /> {course?.title || "Curso"}
                      </span>
                    </td>
                    <td>{formatDate(a.date)}</td>
                    <td>
                      <span className={`status-badge-modern ${a.status === "Present" ? "present" : "absent"}`}>
                        <IoCheckmarkCircle /> {a.status === "Present" ? "Presente" : "Ausente"}
                      </span>
                    </td>
                    <td>
                      <span className="topic-tag-modern">
                        <IoBookmarkOutline /> {a.topic || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={role !== "student" ? 5 : 4} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <IoCalendarOutline style={{ fontSize: "2rem", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "0.95rem" }}>No se encontraron registros de asistencia con los filtros seleccionados.</p>
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
    </div>
  );
}

