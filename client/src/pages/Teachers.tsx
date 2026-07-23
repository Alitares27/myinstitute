import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiUserCheck } from "react-icons/fi";
import { Skeleton } from "../components/Skeleton";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", user_id: "", name: "", specialty: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") }).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    api.get("/teachers").then((res) => setTeachers(res.data));
    api.get("/users").then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  const availableUsers = useMemo(() => {
    const teacherUserIds = new Set(teachers.map((t: any) => Number(t.user_id)));
    return users.filter((u: any) => !teacherUserIds.has(Number(u.id)));
  }, [users, teachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.id) {
      const res = await api.put(
        `/teachers/${form.id}`,
        { specialty: form.specialty }
      );
      setTeachers(teachers.map((t) => (t.id === form.id ? res.data : t)));
    } else {
      const res = await api.post(
        "/teachers",
        { user_id: form.user_id, specialty: form.specialty }
      );
      setTeachers([...teachers, res.data]);
    }

    setForm({ id: "", user_id: "", name: "", specialty: "" });
  };

  const handleEdit = (teacher: any) => {
    setForm({ id: teacher.id, user_id: teacher.user_id, name: teacher.name || "", specialty: teacher.specialty });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/teachers/${id}`);
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const sortedTeachers = useMemo(() => {
    if (!sortConfig) return teachers;
    return [...teachers].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [teachers, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  if (loading) {
    return (
        <div className="teachers-page">
            <Skeleton width="200px" height="1.8rem" />
            <Skeleton width="160px" height="1.1rem" style={{ marginTop: "8px" }} />
            <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: "1rem" }}>
                            <Skeleton height="1rem" style={{ flex: 2 }} />
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
    <div className="teachers-page">
      <h1><span className="page-title-icon"><FiUserCheck /></span> Maestros</h1>
      <h2 className="dashboard-subtitle">{form.id ? <><IoCreateOutline /> Actualizar</> : <><FaPlus /> Agregar</>}</h2>
      {role === "admin" && (
        <form onSubmit={handleSubmit} className="teacher-form">
          {form.id ? (
            <input
              value={form.name}
              readOnly
              style={{ background: "var(--bg-body, #f5f5f5)", cursor: "not-allowed", opacity: 0.8 }}
            />
          ) : (
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
            >
              <option value="">Elegir Miembro</option>
              {availableUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
          <input
            placeholder="Especialidad"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            required
          />
          <div className="form-group full-width">
            <button type="submit" className="btn primary">{form.id ? "Actualizar" : "Agregar"}</button>
            {(form.id || form.user_id || form.specialty) && (
              <button type="button" onClick={() => setForm({ id: "", user_id: "", name: "", specialty: "" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
            )}
          </div>
        </form>
      )}

      <div className="table-container">
        <table
          className="teachers-table"
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
              <th onClick={() => requestSort("specialty")} className="sortable-header">
                Especialidad
                <span className="sort-icon">
                  {sortConfig?.key === "specialty" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              {role === "admin" && <th>Acciones</th>}
            </tr>
          </thead>

          <tbody>
            {sortedTeachers.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td>{t.specialty}</td>
                {role === "admin" && (
                  <td>
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(t)} aria-label="Editar"><IoCreateOutline /></button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(t.id)} aria-label="Eliminar"><IoTrashOutline /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
