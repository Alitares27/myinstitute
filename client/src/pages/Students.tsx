import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaEdit, FaTrash } from "react-icons/fa";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", user_id: "", name: "", grade: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") }).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    axios.get(`${API_BASE_URL}/students`, config).then((res) => setStudents(res.data));
    axios.get(`${API_BASE_URL}/users`, config).then((res) => setUsers(res.data));
  }, []);

  const availableUsers = useMemo(() => {
    return users.filter(u => !students.some(s => s.user_id === u.id));
  }, [users, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        const res = await axios.put(
          `${API_BASE_URL}/students/${form.id}`,
          { name: form.name, grade: form.grade },
          config
        );
        setStudents(students.map((s) => (s.id === form.id ? res.data : s)));
      } else {
        const res = await axios.post(`${API_BASE_URL}/students`, { user_id: form.user_id, grade: form.grade }, config);
        setStudents([...students, res.data]);
      }
      setForm({ id: "", user_id: "", name: "", grade: "" });
    } catch {
      alert("Error al procesar la solicitud");
    }
  };

  const handleEdit = (student: any) => {
    setForm({ id: student.id, user_id: student.user_id.toString(), name: student.name, grade: student.grade });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este estudiante?")) return;
    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(students.filter((s) => s.id !== id));
    } catch {
      alert("Error al eliminar");
    }
  };

  const sortedStudents = useMemo(() => {
    if (!sortConfig) return students;
    return [...students].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortConfig]);

  const totalPages = Math.ceil(sortedStudents.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return sortedStudents.slice(firstIdx, lastIdx);
  }, [sortedStudents, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const requestSort = (key: string) => {
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  return (
    <div className="students-page">
      <h1>👨‍🎓 Estudiantes</h1>
      {role === "admin" && (
        <>
          <h2 className="dashboard-subtitle">{form.id ? "<FaEdit /> Actualizar" : "➕ Agregar"}</h2>
          <form onSubmit={handleSubmit}>
          {form.id ? (
            <input
              value={form.name}
              readOnly
              className="read-only-input"
              style={{ background: "#f0f0f0", cursor: "not-allowed" }}
            />
          ) : (
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
            >
              <option value="">Seleccionar Usuario...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          <input
            placeholder="Organización"
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            required
          />
          <button type="submit" className="btn primary">{form.id ? "Actualizar" : "Agregar"}</button>
          {form.id && (
            <button type="button" onClick={() => setForm({ id: "", user_id: "", name: "", grade: "" })}>
              Cancelar
            </button>
          )}
        </form>
        </>
      )}

        <div className="table-container">
          <table
            className="students-table"
          >
            <thead>
              <tr>
                <th onClick={() => requestSort("name")} className="sortable-header">
                  Nombre
                  <span className="sort-icon">
                    {sortConfig?.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => requestSort("email")} className="sortable-header">
                  Email
                  <span className="sort-icon">
                    {sortConfig?.key === "email" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => requestSort("telefono")} className="sortable-header">
                  Teléfono
                  <span className="sort-icon">
                    {sortConfig?.key === "telefono" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => requestSort("grade")} className="sortable-header">
                  Organización
                  <span className="sort-icon">
                    {sortConfig?.key === "grade" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                {role === "admin" && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {currentRecords.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.telefono}</td>
                  <td>{s.grade}</td>
                  {role === "admin" && (
                    <td>
                      <button className="btn secondary extracted-style-4" onClick={() => handleEdit(s)}><FaEdit /></button>
                      <button className="btn secondary extracted-style-5" onClick={() => handleDelete(s.id)}><FaTrash /></button>
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
