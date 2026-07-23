import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiBriefcase } from "react-icons/fi";
import { TbPlus, TbPencil, TbAlertTriangle, TbBuilding } from "react-icons/tb";
import api from "../api";
import { formatDate, toYMD } from "../utils/dateUtils";
import { Skeleton } from "../components/Skeleton";
import type { Templo } from "../interfaces/Templo";

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
    case "announced": return "status-absent";
    case "under_construction": return "status-absent";
    case "renovation": return "status-absent";
    default: return "status-general";
  }
};

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

  const [loading, setLoading] = useState(true);

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
      const res = await api.get("/temples");
      setTemplos(res.data);
    } catch {
      setError("Error al cargar los templos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, city: form.city, province: form.province, address: form.address, dedicated_date: form.dedicated_date || null, status: form.status };
    try {
      if (form.id) {
        const res = await api.put(`/temples/${form.id}`, payload);
        setTemplos(prev => prev.map(t => t.id === Number(form.id) ? res.data : t));
      } else {
        const res = await api.post("/temples", payload);
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
      dedicated_date: toYMD(t.dedicated_date),
      status: t.status || "operating"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este templo?")) return;
    try {
      await api.delete(`/temples/${id}`);
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

  if (loading) {
    return (
        <div className="dashboard-container">
            <Skeleton width="240px" height="1.8rem" />
            <Skeleton width="200px" height="1.1rem" style={{ marginTop: "8px" }} />
            <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: "1rem" }}>
                            <Skeleton height="1rem" style={{ flex: 2 }} />
                            <Skeleton height="1rem" style={{ flex: 1 }} />
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
    <div className="dashboard-container">
      <h1><span className="page-title-icon"><FiBriefcase /></span> Gestión de Templos</h1>

      {error && <div className="error"><TbAlertTriangle /> {error}</div>}

      <h2 className="dashboard-subtitle">{form.id ? <><TbPencil /> Editar Templo</> : <><TbPlus /> Agregar Templo</>}</h2>
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
          <input
            id="dedicated_date"
            type="date"
            value={form.dedicated_date}
            onChange={e => setForm({ ...form, dedicated_date: e.target.value })}
          />
        </div>
        <div className="form-group full-width">
          <button type="submit" className="btn primary">
            {form.id ? "Actualizar" : "Agregar"}
          </button>
          {(form.id || form.name || form.city || form.province) && (
            <button type="button" className="btn cancel-btn" onClick={() => setForm({ id: "", name: "", city: "", province: "", address: "", dedicated_date: "", status: "operating" })} title="Cancelar" aria-label="Cancelar">✕</button>
          )}
        </div>      </form>

      <div className="grid-form" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Buscar por nombre, ciudad o provincia..."
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
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(t)} aria-label="Editar">
                      <IoCreateOutline />
                    </button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(t.id)} aria-label="Eliminar">
                      <IoTrashOutline />
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
          className="modal-overlay"
          onClick={() => setSelectedTemplo(null)}
        >
          <div
            className="modal-content"
            style={{ minWidth: "320px", maxWidth: "480px" }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedTemplo(null)} title="Cerrar" />

            <h2 style={{ marginBottom: "1.2rem", color: "var(--text-main)", fontSize: "1.2rem", marginTop: '8px' }}>
              <TbBuilding /> {selectedTemplo.name}
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
                    {formatDate(selectedTemplo.dedicated_date, { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                className="btn secondary"
                onClick={() => { handleEdit(selectedTemplo); setSelectedTemplo(null); }}
              >
                <TbPencil /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
