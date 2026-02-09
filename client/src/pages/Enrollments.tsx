import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get(`${API_BASE_URL}/users/me`, config).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    axios.get(`${API_BASE_URL}/enrollments`, config).then((res) => setEnrollments(res.data));
    axios.get(`${API_BASE_URL}/students`, config).then((res) => setStudents(res.data));
    axios.get(`${API_BASE_URL}/courses`, config).then((res) => setCourses(res.data));
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

    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        const res = await axios.put(
          `${API_BASE_URL}/enrollments/${form.id}`,
          { student_id: form.student_id, course_id: form.course_id },
          config
        );
        setEnrollments((prev) => prev.map((e) => (e.id === form.id ? res.data : e)));
      } else {
        const res = await axios.post(`${API_BASE_URL}/enrollments`, form, config);
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
    const token = sessionStorage.getItem("token");
    await axios.delete(`${API_BASE_URL}/enrollments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEnrollments((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="enrollments-page">
      <h1>📝 Matrículas</h1>
      <h2>{role === "admin" ? "➕ Matricular" : "Revisar"}</h2>
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

          <button type="submit">
            {form.id ? "Actualizar" : "Matricular"}
          </button>
        </form>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
        {role === "admin" && (
          <select
            value={studentFilter ?? ""}
            onChange={(e) =>
              setStudentFilter(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Todos los estudiantes</option>
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

      <table className="enrollments-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("student_id")}>Estudiante</th>
            <th onClick={() => handleSort("course_id")}>Curso</th>
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
                  <button onClick={() => handleEdit(en)}>✏️</button>
                  <button onClick={() => handleDelete(en.id)}>🗑️</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            className={currentPage === i + 1 ? "active" : ""}
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
