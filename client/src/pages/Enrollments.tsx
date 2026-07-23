import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiEdit } from "react-icons/fi";
import { TbPlus } from "react-icons/tb";
import { Skeleton } from "../components/Skeleton";

type SortDirection = "asc" | "desc";

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

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") }).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    api.get("/enrollments").then((res) => setEnrollments(res.data));
    api.get("/students").then((res) => setStudents(res.data));
    api.get("/courses").then((res) => setCourses(res.data)).finally(() => setLoading(false));
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
      } else {
        const res = await api.post("/enrollments", form);
        setEnrollments((prev) => [...prev, res.data]);
      }
      setForm({ id: "", student_id: "", course_id: "" });
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
    await api.delete(`/enrollments/${id}`);
    setEnrollments((prev) => prev.filter((e) => e.id !== id));
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
    </div>
  );
}
