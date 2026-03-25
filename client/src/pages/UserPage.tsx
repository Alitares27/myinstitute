import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import axios from "axios";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student" | "teacher";
  telefono?: string;
  specialty?: string;
  grade?: string;
}

type SortKey = "name" | "email" | "role";
type SortOrder = "asc" | "desc";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student" as "admin" | "student" | "teacher",
    specialty: "",
    grade: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const meRes = await Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") });
      setCurrentUser(meRes.data);
      if (meRes.data.role === "admin") {
        const usersRes = await axios.get(`${API_BASE_URL}/users`, config);
        setUsers(usersRes.data);
      }
    } catch (err) {
      setError("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const aVal = (a[sortKey] || "").toString().toLowerCase();
      const bVal = (b[sortKey] || "").toString().toLowerCase();
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortKey, sortOrder]);

  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return sortedUsers.slice(firstIdx, lastIdx);
  }, [sortedUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handleEditClick = (user: User) => {
    setForm({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: "",
      telefono: user.telefono || "",
      role: user.role,
      specialty: user.specialty || "",
      grade: user.grade || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const handleSave = async () => {
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (form.id) {
        const res = await axios.put(`${API_BASE_URL}/users/${form.id}`, form, config);
        if (Number(form.id) === currentUser?.id) setCurrentUser(res.data);
        setUsers(users.map((u) => (u.id === Number(form.id) ? res.data : u)));
        alert("Datos actualizados con éxito");
      } else {
        const res = await axios.post(`${API_BASE_URL}/users`, form, config);
        setUsers([...users, res.data.user]);
        alert("Usuario creado con éxito");
      }
      resetForm();
    } catch (err) {
      setError("Error al procesar la solicitud");
    }
  };

  const resetForm = () => {
    setForm({ id: "", name: "", email: "", password: "", telefono: "", role: "student", specialty: "", grade: "" });
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p className="extracted-style-4">{error}</p>;
  if (!currentUser) return <p>No se encontró usuario</p>;

  return (
    <div className="user-page">
      <h1>👤 Gestión de Perfil</h1>
      <h2 className="dashboard-subtitle">
        {form.id ? <><FaEdit /> Editando: {form.name}</> : "➕ Agregar"}
      </h2>

      <div className="form-card">
        <div className="grid-form">
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input
            placeholder={form.id ? "Nueva contraseña (opcional)" : "Contraseña"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />

          {currentUser.role === "admin" && (
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
              <option value="student">Estudiante</option>
              <option value="teacher">Maestro</option>
              <option value="admin">Admin</option>
            </select>
          )}

          {form.role === "teacher" && currentUser.role === "admin" && (
            <input placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          )}

          {form.role === "student" && currentUser.role === "admin" && (
            <input placeholder="Organización" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          )}

          <div className="form-actions">
            <button onClick={handleSave} className="btn primary">{form.id ? "Actualizar" : "Agregar"}</button>
            {form.id && <button onClick={resetForm} className="btn secondary">Cancelar</button>}
          </div>
        </div>
      </div>

      {currentUser.role === "admin" ? (
        <div className="admin-section">
          <h3>Lista de Usuarios</h3>

          <div className="search-container" style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ padding: "5px", borderRadius: "4px", border: "1px solid #ccc", width: "100%", maxWidth: "300px" }}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} className="sortable-header">
                    Nombre
                    <span className="sort-icon">{sortKey === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th onClick={() => handleSort("email")} className="sortable-header">
                    Email
                    <span className="sort-icon">{sortKey === "email" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th>Teléfono</th>
                  <th onClick={() => handleSort("role")} className="sortable-header">
                    Rol
                    <span className="sort-icon">{sortKey === "role" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}</span>
                  </th>
                  <th>Organización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.telefono || "-"}</td>
                    <td><span className={`badge-${u.role}`}>{u.role}</span></td>
                    <td>{u.specialty || u.grade || "-"}</td>
                    <td>
                      <button onClick={() => handleEditClick(u)} className="btn secondary extracted-style-4">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="btn secondary extracted-style-4">
                        <FaTrash />
                      </button>
                    </td>
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
      ) : (
        !form.id && (
          <div className="profile-display card">
            <h3>Mis Datos Actuales</h3>
            <p><strong>Nombre:</strong> {currentUser.name}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Teléfono:</strong> {currentUser.telefono || "No registrado"}</p>
            <button onClick={() => handleEditClick(currentUser)} className="btn secondary">
              Editar Mi Perfil
            </button>
          </div>
        )
      )}
    </div>
  );
}

export default UserPage;