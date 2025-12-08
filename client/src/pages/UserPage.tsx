import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import "../index.css";

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
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student",
    specialty: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setCurrentUser(res.data);

        if (res.data.role === "admin") {
          axios
            .get("http://localhost:5000/api/users", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setUsers(res.data))
            .catch(() => setError("Error cargando usuarios"));
        }
      })
      .catch(() => setError("Error cargando usuario actual"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    await axios.delete(`http://localhost:5000/api/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(users.filter((u) => u.id !== id));
  };

  const handleEdit = async (id: number, data: Partial<User>) => {
    const token = localStorage.getItem("token");
    const user = users.find((u) => u.id === id);
    if (!user) return;

    const res = await axios.put(
      `http://localhost:5000/api/users/${id}`,
      {
        name: data.name ?? user.name,
        email: data.email ?? user.email,
        telefono: data.telefono ?? user.telefono,
        role: data.role ?? user.role,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setUsers(users.map((u) => (u.id === id ? res.data : u)));
  };

  const handleCreate = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://localhost:5000/api/users",
        {
          name: form.name,
          email: form.email,
          password: form.password,
          telefono: form.telefono,
          role: form.role,
          specialty: form.role === "teacher" ? form.specialty : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers([...users, res.data.user]);
      setForm({
        name: "",
        email: "",
        password: "",
        telefono: "",
        role: "student",
        specialty: "",
      });
    } catch (err) {
      console.error("Error creando usuario:", err);
      setError("Error creando usuario");
    }
  };

  if (loading) return <Layout><p>Cargando...</p></Layout>;
  if (error) return <Layout><p>{error}</p></Layout>;
  if (!currentUser) return <Layout><p>No se encontró usuario</p></Layout>;

  return (
    <Layout>
      <div className="user-page">
        <h2>👤 User Page</h2>

        {currentUser.role === "admin" ? (
          <div>
            <h3>Admin Panel</h3>

            <div className="user-form">
              <input
                placeholder="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <input
                placeholder="Telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />

              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="student">Estudiante</option>
                <option value="teacher">Maestro</option>
                <option value="admin">Admin</option>
              </select>

              {form.role === "teacher" && (
                <input
                  placeholder="Specialty"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              )}

              <button onClick={handleCreate}>➕ Crear Usuario</button>
            </div>

            <table className="users-table">
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() =>
                          handleEdit(u.id, { name: u.name + " (editado)" })
                        }
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(u.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="profile-info">
            <h3>Mi Perfil</h3>
            <p><strong>ID:</strong> {currentUser.id}</p>
            <p><strong>Nombre:</strong> {currentUser.name}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Rol:</strong> {currentUser.role}</p>
            <button
              className="edit-button"
              onClick={() =>
                handleEdit(currentUser.id, {
                  name: currentUser.name + " (editado)",
                })
              }
            >
              ✏️ Editar Perfil
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default UserPage;