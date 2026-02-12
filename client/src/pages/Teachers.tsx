import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", user_id: "", specialty: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get(`${API_BASE_URL}/users/me`, config).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    axios.get(`${API_BASE_URL}/teachers`, config).then((res) => setTeachers(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    if (form.id) {
      const res = await axios.put(
        `${API_BASE_URL}/teachers/${form.id}`,
        { specialty: form.specialty },
        config
      );
      setTeachers(teachers.map((t) => (t.id === form.id ? res.data : t)));
    } else {
      const res = await axios.post(
        `${API_BASE_URL}/teachers`,
        { user_id: form.user_id, specialty: form.specialty },
        config
      );
      setTeachers([...teachers, res.data]);
    }

    setForm({ id: "", user_id: "", specialty: "" });
  };

  const handleEdit = (teacher: any) => {
    setForm({ id: teacher.id, user_id: teacher.user_id, specialty: teacher.specialty });
  };

  const handleDelete = async (id: string) => {
    const token = sessionStorage.getItem("token");
    await axios.delete(`${API_BASE_URL}/teachers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTeachers(teachers.filter((t) => t.id !== id));
  };

  const filteredTeachers = useMemo(() => {
    return role === "teacher"
      ? teachers.filter((t) => t.user_id === userId)
      : teachers;
  }, [teachers, role, userId]);

  const sortedTeachers = useMemo(() => {
    if (!sortConfig) return filteredTeachers;
    return [...filteredTeachers].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTeachers, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  return (
    <div className="teachers-page">
      <h1>👨‍🏫 Maestros</h1>
      <h2>{form.id ? "✏️ Actualizar" : "➕ Agregar"}</h2>
      {role === "admin" && (
        <form onSubmit={handleSubmit} className="teacher-form">
          <input
            placeholder="ID Usuario"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            required
          />
          <input
            placeholder="Especialidad"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            required
          />
          <button type="submit">{form.id ? "Actualizar" : "Agregar"}</button>
        </form>
      )}

      {role === "admin" ? (
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            className="teachers-table"
            style={{ minWidth: "650px", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th onClick={() => requestSort("name")}>Nombre</th>
                <th onClick={() => requestSort("email")}>Email</th>
                <th onClick={() => requestSort("specialty")}>Especialidad</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {sortedTeachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.specialty}</td>
                  <td>
                    <button onClick={() => handleEdit(t)}>✏️</button>
                    <button onClick={() => handleDelete(t.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (
        sortedTeachers.map((t) => (
          <div key={t.id} className="teacher-info">
            <p><strong>Nombre:</strong> {t.name}</p>
            <p><strong>Email:</strong> {t.email}</p>
            <p><strong>Especialidad:</strong> {t.specialty}</p>
          </div>
        ))
      )}
    </div>
  );
}
