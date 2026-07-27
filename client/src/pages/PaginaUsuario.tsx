import { useEffect, useState, useMemo } from "react";
import { FaSearch, FaIdCard, FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiUser } from "react-icons/fi";
import { TbLock } from "react-icons/tb";
import api from "../api";
import { Skeleton } from "../components/Esqueleto";

function UserPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const userRes = JSON.parse(localStorage.getItem("user") || "{}");
      setCurrentUser(userRes);
      if (userRes.role === "admin") {
        const res = await api.get("/users");
        setUsers(res.data);
      }
    } catch {
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
    try {
      if (form.id) {
        const res = await api.put(`/users/${form.id}`, form);
        setUsers(users.map(u => u.id === Number(form.id) ? { ...u, ...res.data } : u));
        alert("Miembro actualizado correctamente");
      } else {
        const res = await api.post("/users", form);
        setUsers([...users, res.data.user]);
        alert("Miembro creado con éxito");
      }
      resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al procesar la solicitud");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Confirmas la eliminación de este miembro?")) return;
    try {
      await api.delete(`/users/${id}`);
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

  const handlePasswordChange = async () => {
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      alert("Las contraseñas nuevas no coinciden");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    try {
      await api.put("/users/me/password", {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      alert("Contraseña actualizada correctamente");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al cambiar contraseña");
    }
  };

  if (loading) {
    return (
      <div className="user-page">
        <Skeleton width="240px" height="1.8rem" />
        <Skeleton width="200px" height="1.1rem" style={{ marginTop: "12px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem", padding: "1rem", background: "var(--bg-card)", borderRadius: "var(--radius)" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Skeleton height="2.5rem" style={{ flex: 1 }} />
            <Skeleton height="2.5rem" style={{ flex: 1 }} />
          </div>
          <Skeleton height="2.5rem" width="120px" />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="user-page">
      <h1><span className="page-title-icon"><FiUser /></span> {isAdmin ? "Gestión de Miembros" : "Mi Perfil"}</h1>

      {isAdmin ? (
        <>
          <h2 className="dashboard-subtitle">
            {form.id ? <><IoCreateOutline /> Editar Miembro</> : <><FaPlus /> Registrar Miembro</>}
          </h2>

          <div className="form-card">
            <div className="grid-form minimal-form">
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
                <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                  <option value="">Elegir Organización</option>
                  <option value="M. Jovenes">M. Jovenes</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Q. Elderes">Q. Elderes</option>
                  <option value="S. Aaronico">S. Aaronico</option>
                  <option value="Soc. Soc.">Soc. Soc.</option>
                </select>
              )}

              <div className="form-group full-width">
                <button onClick={handleSave} className="btn primary">{form.id ? "Guardar" : "Agregar"}</button>
                {(form.id || form.name || form.email) && (
                  <button type="button" onClick={resetForm} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="admin-section">
            <h3>Lista de Miembros</h3>

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
                          aria-label="Editar"
                        >
                          <IoCreateOutline />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="btn secondary extracted-style-5"
                          aria-label="Eliminar"
                        >
                          <IoTrashOutline />
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
        </>
      ) : (
        <>
          <div className="form-card" style={{ maxWidth: 480 }}>
            <h3 style={{ marginTop: 0 }}>{currentUser?.name}</h3>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0 0" }}>{currentUser?.email}</p>
            {currentUser?.telefono && (
              <p style={{ color: "var(--text-secondary)", margin: "4px 0 0" }}>Tel: {currentUser.telefono}</p>
            )}
            {currentUser?.document && (
              <p style={{ color: "var(--text-secondary)", margin: "4px 0 16px" }}>Doc: {currentUser.document}</p>
            )}
            {!currentUser?.telefono && !currentUser?.document && <div style={{ marginBottom: 16 }} />}
          </div>

          <h2 className="dashboard-subtitle"><TbLock /> Cambiar Contraseña</h2>
          <div className="form-card" style={{ maxWidth: 480 }}>
            <div className="grid-form minimal-form">
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Contraseña actual"
                  value={pwdForm.currentPassword}
                  onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                />
              </div>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                  value={pwdForm.confirmPassword}
                  onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <button
                  onClick={handlePasswordChange}
                  className="btn primary"
                  disabled={!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword}
                >
                  Actualizar Contraseña
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserPage;
