import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiUsers } from "react-icons/fi";
import { TbList } from "react-icons/tb";
import { Skeleton } from "../components/Esqueleto";
import type { SortConfig } from "../interfaces/Common";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", user_id: "", name: "", grade: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [loading, setLoading] = useState(true);

  const [showMaestrosModal, setShowMaestrosModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [maestroForm, setMaestroForm] = useState({ id: "", user_id: "", name: "", specialty: "" });
  const [maestroUsers, setMaestroUsers] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    Promise.resolve({ data: JSON.parse(localStorage.getItem("user") || "{}") }).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    api.get("/students").then((res) => setStudents(res.data));
    api.get("/users").then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  const availableUsers = useMemo(() => {
    return users.filter(u => !students.some(s => s.user_id === u.id));
  }, [users, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (form.id) {
        const res = await api.put(
          `/students/${form.id}`,
          { name: form.name, grade: form.grade }
        );
        setStudents(students.map((s) => (s.id === form.id ? res.data : s)));
      } else {
        const res = await api.post("/students", { user_id: form.user_id, grade: form.grade });
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
      await api.delete(`/students/${id}`);
      setStudents(students.filter((s) => s.id !== id));
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleOpenMaestros = async () => {
    setShowMaestrosModal(true);
    const [teachersRes, usersRes] = await Promise.all([
      api.get("/teachers"),
      api.get("/users"),
    ]);
    setTeachers(teachersRes.data);
    setMaestroUsers(usersRes.data);
  };

  const maestroAvailableUsers = useMemo(() => {
    const teacherUserIds = new Set(teachers.map((t: any) => Number(t.user_id)));
    return maestroUsers.filter((u: any) => !teacherUserIds.has(Number(u.id)));
  }, [maestroUsers, teachers]);

  const handleMaestroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (maestroForm.id) {
        const res = await api.put(`/teachers/${maestroForm.id}`, { specialty: maestroForm.specialty });
        setTeachers(teachers.map((t) => (t.id === maestroForm.id ? res.data : t)));
      } else {
        const res = await api.post("/teachers", { user_id: maestroForm.user_id, specialty: maestroForm.specialty });
        setTeachers([...teachers, res.data]);
      }
      setMaestroForm({ id: "", user_id: "", name: "", specialty: "" });
    } catch {
      alert("Error al procesar la solicitud");
    }
  };

  const handleMaestroEdit = (teacher: any) => {
    setMaestroForm({ id: teacher.id, user_id: teacher.user_id, name: teacher.name || "", specialty: teacher.specialty });
  };

  const handleMaestroDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este maestro?")) return;
    try {
      await api.delete(`/teachers/${id}`);
      setTeachers(teachers.filter((t) => t.id !== id));
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

  if (loading) {
    return (
      <div className="students-page">
        <Skeleton width="200px" height="1.8rem" />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "1rem" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <Skeleton height="2.5rem" style={{ flex: 2 }} />
            <Skeleton height="2.5rem" style={{ flex: 1 }} />
          </div>
          <Skeleton height="2.5rem" width="120px" />
        </div>
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem" }}>
                <Skeleton height="1rem" style={{ flex: 2 }} />
                <Skeleton height="1rem" style={{ flex: 2 }} />
                <Skeleton height="1rem" style={{ flex: 1 }} />
                <Skeleton height="1rem" style={{ flex: 1 }} />
                <Skeleton width="70px" height="1.8rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="students-page">
      <h1><span className="page-title-icon"><FiUsers /></span> Miembros</h1>
      {role === "admin" && (
        <>
          <h2 className="dashboard-subtitle">{form.id ? <><IoCreateOutline /> Actualizar</> : <><FaPlus /> Agregar</>}</h2>
          <form onSubmit={handleSubmit} className="activity-form">
            <div className="form-row">
              <div className="form-group">
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
                    <option value="">Elegir Miembro</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required>
                  <option value="">Elegir Organización</option>
                  <option value="M. Jovenes">M. Jovenes</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Q. Elderes">Q. Elderes</option>
                  <option value="S. Aaronico">S. Aaronico</option>
                  <option value="Soc. Soc.">Soc. Soc.</option>
                </select>
              </div>
              <div className="form-group" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                <button type="submit" className="btn primary">{form.id ? "Actualizar" : "Agregar"}</button>
                {(form.id || form.user_id || form.grade) && (
                  <button type="button" onClick={() => setForm({ id: "", user_id: "", name: "", grade: "" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
                )}
                <button type="button" className="btn secondary" onClick={handleOpenMaestros}>
                  <TbList /> Ver Maestros
                </button>
              </div>


            </div>

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
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(s)} aria-label="Editar"><IoCreateOutline /></button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(s.id)} aria-label="Eliminar"><IoTrashOutline /></button>
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
      {showMaestrosModal && (
        <div className="modal-overlay" onClick={() => setShowMaestrosModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <button className="modal-close" onClick={() => setShowMaestrosModal(false)} aria-label="Cerrar" />
            <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>Maestros</h2>

            {role === "admin" && (
              <form onSubmit={handleMaestroSubmit} className="activity-form" style={{ marginBottom: "1rem" }}>
                <div className="form-row">
                  <div className="form-group">
                    {maestroForm.id ? (
                      <input value={maestroForm.name} readOnly style={{ background: "#f0f0f0", cursor: "not-allowed", opacity: 0.8 }} />
                    ) : (
                      <select value={maestroForm.user_id} onChange={e => setMaestroForm({ ...maestroForm, user_id: e.target.value })} required>
                        <option value="">Elegir Miembro</option>
                        {maestroAvailableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <input placeholder="Especialidad" value={maestroForm.specialty} onChange={e => setMaestroForm({ ...maestroForm, specialty: e.target.value })} required />
                  </div>
                  <div className="form-group" style={{ width: "40%" }}>
                    <button type="submit" className="btn primary">{maestroForm.id ? "Actualizar" : "Agregar"}</button>
                    {(maestroForm.id || maestroForm.user_id || maestroForm.specialty) && (
                      <button type="button" onClick={() => setMaestroForm({ id: "", user_id: "", name: "", specialty: "" })} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
                    )}
                  </div>
                </div>
              </form>
            )}

            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Especialidad</th>
                    {role === "admin" && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {teachers.length > 0 ? (
                    teachers.map((t: any) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.specialty}</td>
                        {role === "admin" && (
                          <td>
                            <button className="btn secondary extracted-style-4" onClick={() => handleMaestroEdit(t)} aria-label="Editar"><IoCreateOutline /></button>
                            <button className="btn secondary extracted-style-5" onClick={() => handleMaestroDelete(t.id)} aria-label="Eliminar"><IoTrashOutline /></button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={role === "admin" ? 3 : 2}>No hay maestros registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
