import { useEffect, useState, useMemo } from "react";
import { FaEdit, FaTrash, FaSearch, FaIdCard } from "react-icons/fa";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student",
    specialty: "",
    grade: "",
    document: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const userRes = JSON.parse(sessionStorage.getItem("user") || "{}");
      setCurrentUser(userRes);
      if (userRes.role === "admin") {
        const res = await axios.get(`${API_BASE_URL}/users`, config);
        setUsers(res.data);
      }
    } catch (err) {
      setError("Error cargando los datos del servidor");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [users, searchTerm]);

  const currentRecords = useMemo(() => {
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    return filteredUsers.slice(indexOfFirstRecord, indexOfLastRecord);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / recordsPerPage);

  const handleSave = async () => {
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (form.id) {
        const res = await axios.put(`${API_BASE_URL}/users/${form.id}`, form, config);
        setUsers(users.map(u => u.id === Number(form.id) ? { ...u, ...res.data } : u));
        alert("Usuario actualizado correctamente");
      } else {
        const res = await axios.post(`${API_BASE_URL}/users`, form, config);
        setUsers([...users, res.data.user]);
        alert("Usuario creado con éxito");
      }
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al procesar la solicitud");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Confirmas la eliminación de este usuario?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter(u => u.id !== id));
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleEditClick = (u: any) => {
    setForm({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      password: "",
      telefono: u.telefono || "",
      role: u.role,
      specialty: u.specialty || "",
      grade: u.grade || "",
      document: u.document ? u.document.toString() : ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm({ id: "", name: "", email: "", password: "", telefono: "", role: "student", specialty: "", grade: "", document: "" });
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="user-page">
      <h1>👤 Gestión de Usuarios</h1>

      <h2 className="dashboard-subtitle">
        {form.id ? <><FaEdit /> Editar Usuario</> : "➕ Registrar Usuario"}
      </h2>

      <div className="form-card">
        <div className="grid-form">
          <div className="input-group">
            <input placeholder="Nombre Completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="input-group">
            <input placeholder="Correo Electrónico" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="input-group">
            <input type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="input-group">
            <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="input-group">
            <input
              type="number"
              placeholder="Número de Documento"
              value={form.document}
              onChange={e => setForm({ ...form, document: e.target.value })}
              min="0"
            />
          </div>

          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="student">Miembro</option>
            <option value="teacher">Líder</option>
            <option value="admin">Administrador</option>
          </select>

          {form.role === "teacher" && (
            <input placeholder="Especialidad" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} />
          )}
          {form.role === "student" && (
            <input placeholder="Organización" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} />
          )}

          <div className="form-actions">
            <button onClick={handleSave} className="btn primary">{form.id ? "Guardar" : "Agregar"}</button>
            {form.id && <button onClick={resetForm} className="btn secondary">Cancelar</button>}
          </div>
        </div>
      </div>

      {currentUser?.role === "admin" && (
        <div className="admin-section">
          <h3>Lista de Usuarios</h3>

          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', margin: '15px 0', gap: '10px' }}>
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', maxWidth: '300px', padding: '8px' }}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Documento</th>
                  <th>Llamamiento</th>
                  <th>Organización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.document
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FaIdCard />{u.document}</span>
                        : <span style={{ color: 'var(--text-muted, #888)' }}>-</span>}
                    </td>
                    <td>
                      <span className={`badge-${u.role}`}>
                        {u.role === "student" ? "Miembro" : "Líder"}
                      </span>
                    </td>
                    <td>{u.specialty || u.grade || "-"}</td>
                    <td>
                      <button
                        onClick={() => handleEditClick(u)}
                        className="btn secondary extracted-style-4"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="btn secondary extracted-style-5"
                      >
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
              <select value={currentPage} onChange={e => setCurrentPage(Number(e.target.value))}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserPage;