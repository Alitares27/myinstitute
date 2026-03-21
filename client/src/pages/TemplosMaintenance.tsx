import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import axios from "axios";

interface Templo {
  id: number;
  name: string;
  city: string;
  province: string;
  address?: string;
  dedicated_date?: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "operating", label: "En funcionamiento" },
  { value: "announced", label: "Anunciado" },
  { value: "under_construction", label: "En construcción" },
  { value: "renovation", label: "En renovación" },
];

const getStatusLabel = (status: string) => {
  return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "operating": return "status-present";
    case "announced": return "status-general";
    case "under_construction": return "status-absent";
    case "renovation": return "status-absent";
    default: return "status-general";
  }
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TemplosMaintenance() {
  const navigate = useNavigate();
  const [templos, setTemplos] = useState<Templo[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: "", name: "", city: "", province: "", address: "", dedicated_date: "", status: "operating" });
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [selectedTemplo, setSelectedTemplo] = useState<Templo | null>(null);

  useEffect(() => {
    const role = JSON.parse(sessionStorage.getItem("user") || "{}").role;
    if (role !== "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchTemplos();
  }, [navigate]);

  const fetchTemplos = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/temples`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplos(res.data);
    } catch {
      setError("Error al cargar los templos");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const payload = { name: form.name, city: form.city, province: form.province, address: form.address, dedicated_date: form.dedicated_date || null, status: form.status };
    try {
      if (form.id) {
        const res = await axios.put(`${API_BASE_URL}/temples/${form.id}`, payload, config);
        setTemplos(prev => prev.map(t => t.id === Number(form.id) ? res.data : t));
      } else {
        const res = await axios.post(`${API_BASE_URL}/temples`, payload, config);
        setTemplos(prev => [...prev, res.data]);
      }
      setForm({ id: "", name: "", city: "", province: "", address: "", dedicated_date: "", status: "operating" });
      setError(null);
    } catch {
      setError("Error al guardar el templo");
    }
  };

  const handleEdit = (t: Templo) => {
    setForm({
      id: String(t.id),
      name: t.name,
      city: t.city || "",
      province: t.province || "",
      address: t.address || "",
      dedicated_date: t.dedicated_date ? t.dedicated_date.split("T")[0] : "",
      status: t.status || "operating"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este templo?")) return;
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/temples/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemplos(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("Error al eliminar el templo. Puede que tenga viajes asociados.");
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const filteredTemplos = useMemo(() =>
    templos.filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.province?.toLowerCase().includes(search.toLowerCase())
    ),
    [templos, search]
  );

  const sortedTemplos = useMemo(() => {
    if (!sortConfig) return filteredTemplos;
    return [...filteredTemplos].sort((a, b) => {
      const aVal = (a[sortConfig.key as keyof Templo] ?? "").toString().toLowerCase();
      const bVal = (b[sortConfig.key as keyof Templo] ?? "").toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTemplos, sortConfig]);

  const totalPages = Math.ceil(sortedTemplos.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedTemplos.slice(start, start + recordsPerPage);
  }, [sortedTemplos, currentPage]);

  return (
    <div className="dashboard-container">
      <h1>🕌 Gestión de Templos</h1>

      {error && <div className="error">⚠️ {error}</div>}

      <h2 className="dashboard-subtitle">{form.id ? "✏️ Editar Templo" : "➕ Agregar Templo"}</h2>
      <form onSubmit={handleSubmit} className="grid-form">
        <input
          type="text"
          placeholder="Nombre del templo"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Ciudad"
          value={form.city}
          onChange={e => setForm({ ...form, city: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Provincia / Estado"
          value={form.province}
          onChange={e => setForm({ ...form, province: e.target.value })}
          required
        />
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Dirección"
          value={form.address}
          onChange={e => setForm({ ...form, address: e.target.value })}
        />
        <div className="form-group">
          <label htmlFor="dedicated_date" style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Fecha de dedicación</label>
          <input
            id="dedicated_date"
            type="date"
            value={form.dedicated_date}
            onChange={e => setForm({ ...form, dedicated_date: e.target.value })}
          />
        </div>
        <button type="submit" className="btn primary">
          {form.id ? "Actualizar" : "Agregar"}
        </button>
        {form.id && (
          <button type="button" className="btn secondary" onClick={() => setForm({ id: "", name: "", city: "", province: "", address: "", dedicated_date: "", status: "operating" })}>
            Cancelar
          </button>
        )}
      </form>

      <div className="grid-form" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, ciudad o provincia..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} className="sortable-header">
                Nombre
                <span className="sort-icon">
                  {sortConfig?.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("city")} className="sortable-header">
                Ciudad
                <span className="sort-icon">
                  {sortConfig?.key === "city" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("province")} className="sortable-header">
                Provincia
                <span className="sort-icon">
                  {sortConfig?.key === "province" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("status")} className="sortable-header">
                Estado
                <span className="sort-icon">
                  {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.length > 0 ? (
              currentRecords.map(t => (
                <tr key={t.id}>
                  <td>
                    <button
                      className="btn-link"
                      onClick={() => setSelectedTemplo(t)}
                      style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: 600, padding: 0, textDecoration: "underline" }}
                    >
                      {t.name}
                    </button>
                  </td>
                  <td>{t.city || "—"}</td>
                  <td>{t.province || "—"}</td>
                  <td>
                    <span className={getStatusClass(t.status)}>
                      {getStatusLabel(t.status)}
                    </span>
                  </td>
                  <td>
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(t)}>
                      <FaEdit />
                    </button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(t.id)}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>No hay templos registrados.</td>
              </tr>
            )}
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

      {selectedTemplo && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)"
          }}
          onClick={() => setSelectedTemplo(null)}
        >
          <div
            style={{
              background: "var(--bg-surface)", borderRadius: "16px",
              padding: "2rem", minWidth: "320px", maxWidth: "480px", width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)", position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTemplo(null)}
              style={{
                position: "absolute", top: "1rem", right: "1rem",
                background: "var(--bg-body)", border: "none", borderRadius: "50%",
                width: "32px", height: "32px", cursor: "pointer",
                fontSize: "1rem", color: "var(--text-muted)", display: "flex",
                alignItems: "center", justifyContent: "center"
              }}
              title="Cerrar"
            >
              ✕
            </button>

            <h2 style={{ marginBottom: "1.2rem", color: "var(--text-main)", fontSize: "1.2rem" }}>
              🕌 {selectedTemplo.name}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>ESTADO</span>
                <span className={getStatusClass(selectedTemplo.status)}>{getStatusLabel(selectedTemplo.status)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>CIUDAD</span>
                <span style={{ color: "var(--text-main)" }}>{selectedTemplo.city || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>PROVINCIA</span>
                <span style={{ color: "var(--text-main)" }}>{selectedTemplo.province || "—"}</span>
              </div>
              {selectedTemplo.address && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>DIRECCIÓN</span>
                  <span style={{ color: "var(--text-main)", textAlign: "right", maxWidth: "60%" }}>{selectedTemplo.address}</span>
                </div>
              )}
              {selectedTemplo.dedicated_date && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>DEDICADO</span>
                  <span style={{ color: "var(--text-main)" }}>
                    {new Date(selectedTemplo.dedicated_date).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                className="btn secondary"
                onClick={() => { handleEdit(selectedTemplo); setSelectedTemplo(null); }}
              >
                ✏️ Editar
              </button>
              <button className="btn secondary" onClick={() => setSelectedTemplo(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
