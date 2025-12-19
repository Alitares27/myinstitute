import { useEffect, useState } from "react";
import axios from "axios";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "student" | "teacher";
  telefono?: string;
  specialty?: string;
}

function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "", 
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student",
    specialty: "",
  });

  const API_URL = "http://localhost:5000/api/users";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const meRes = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(meRes.data);

      if (meRes.data.role === "admin") {
        const usersRes = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(usersRes.data);
      }
    } catch (err) {
      setError("Error cargando datos");
    } finally {
      setLoading(false);
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/${id}`, {
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
        const res = await axios.put(`${API_URL}/${form.id}`, {
          name: form.name,
          email: form.email,
          telefono: form.telefono,
          role: form.role,
        }, config);
        
        setUsers(users.map((u) => (u.id === Number(form.id) ? res.data : u)));
        alert("Usuario actualizado con éxito");
      } else {
        const res = await axios.post(API_URL, {
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

      {currentUser.role === "admin" ? (
        <div>
          <div style={{ background: "#f0f0f0", borderRadius: "8px", marginBottom: "20px" }}>
            <h3>{form.id ? "✏️ Editando Usuario" : "➕ Crear Nuevo Usuario"}</h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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

              <button onClick={handleSave} style={{ background: form.id ? "#2196F3" : "#4CAF50", color: "white", padding: "8px 15px", border: "none", cursor: "pointer" }}>
                {form.id ? "Guardar Cambios" : "Crear Usuario"}
              </button>
              
              {form.id && <button onClick={resetForm}>Cancelar</button>}
            </div>
          </div>

          <table border={1} cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#eee" }}>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge-${u.role}`}>{u.role}</span></td>
                  <td>
                    <button onClick={() => handleEditClick(u)} style={{ marginRight: "10px" }}>✏️ Editar</button>
                    <button onClick={() => handleDelete(u.id)} style={{ color: "red" }}>🗑️ Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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