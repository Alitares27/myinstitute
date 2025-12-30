import { useEffect, useState, useMemo } from "react";
import axios from "axios";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student" | "teacher";
  telefono?: string;
  specialty?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/users";

function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [form, setForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student" as "admin" | "student" | "teacher",
    specialty: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const meRes = await axios.get(`${API_BASE_URL}/me`, config);
      setCurrentUser(meRes.data);

      if (meRes.data.role === "admin") {
        const usersRes = await axios.get(API_BASE_URL, config);
        setUsers(usersRes.data);
      }
    } catch (err) {
      setError("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(users.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return users.slice(firstIdx, lastIdx);
  }, [users, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleEditClick = (user: User) => {
    setForm({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: "",
      telefono: user.telefono || "",
      role: user.role,
      specialty: user.specialty || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        const res = await axios.put(`${API_BASE_URL}/${form.id}`, {
          name: form.name,
          email: form.email,
          telefono: form.telefono,
          role: form.role,
        }, config);

        setUsers(users.map((u) => (u.id === Number(form.id) ? res.data : u)));
        alert("Usuario actualizado con éxito");
      } else {
        const res = await axios.post(API_BASE_URL, {
          name: form.name,
          email: form.email,
          password: form.password,
          telefono: form.telefono,
          role: form.role,
          specialty: form.role === "teacher" ? form.specialty : null,
        }, config);

        setUsers([...users, res.data.user]);
        alert("Usuario creado con éxito");
      }
      resetForm();
    } catch (err) {
      setError("Error al procesar la solicitud");
    }
  };

  const resetForm = () => {
    setForm({ id: "", name: "", email: "", password: "", telefono: "", role: "student", specialty: "" });
  };

  if (loading) return <p>Cargando...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!currentUser) return <p>No se encontró usuario</p>;

  return (
    <div className="user-page">
      <h2>👤 Gestión de Usuarios</h2>
      <h3>{form.id ? "✏️ Actualizar" : "➕ Agregar"}</h3>
      {currentUser.role === "admin" ? (
        <div>
          <div className="form-card">
            <div className="grid-form">
              <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              {!form.id && (
                <input
                  placeholder="Contraseña"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}

              <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />

              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="student">Estudiante</option>
                <option value="teacher">Maestro</option>
                <option value="admin">Admin</option>
              </select>

              {form.role === "teacher" && (
                <input placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
              )}

              <button onClick={handleSave}>
                {form.id ? "Actualizar" : "Crear"}
              </button>

              {form.id && <button onClick={resetForm} className="cancel-button">Cancelar</button>}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge-${u.role}`}>{u.role}</span></td>
                  <td>
                    <button onClick={() => handleEditClick(u)} className="edit-button">✏️</button>
                    <button onClick={() => handleDelete(u.id)} className="delete-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={currentPage === i + 1 ? "active" : ""}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="profile-info">
          <h3>Mi Perfil</h3>
          <p><strong>Nombre:</strong> {currentUser.name}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
          <p><strong>Rol:</strong> {currentUser.role}</p>
        </div>
      )}
    </div>
  );
}

export default UserPage;