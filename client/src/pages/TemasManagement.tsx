import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiList } from "react-icons/fi";
import { TbPlus, TbPencil, TbAlertTriangle } from "react-icons/tb";
import api from "../api";
import { Skeleton } from "../components/Skeleton";

interface Tema {
  id: number;
  title: string;
}

export default function TemasManagement() {
  const navigate = useNavigate();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: "", title: "" });
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = JSON.parse(sessionStorage.getItem("user") || "{}").role;
    if (role !== "admin") {
      navigate("/dashboard", { replace: true });
      return;
    }
    fetchTemas();
  }, [navigate]);

  const fetchTemas = async () => {
    try {
      const res = await api.get("/temas");
      setTemas(res.data);
    } catch {
      setError("Error al cargar los temas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (form.id) {
        const res = await api.put(`/temas/${form.id}`, { title: form.title });
        setTemas(prev => prev.map(t => t.id === Number(form.id) ? res.data : t));
      } else {
        const res = await api.post("/temas", { title: form.title });
        setTemas(prev => [...prev, res.data]);
      }
      setForm({ id: "", title: "" });
      setError(null);
    } catch {
      setError("Error al guardar el tema");
    }
  };

  const handleEdit = (tema: Tema) => {
    setForm({ id: String(tema.id), title: tema.title });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este tema?")) return;
    try {
      await api.delete(`/temas/${id}`);
      setTemas(prev => prev.filter(t => t.id !== id));
    } catch {
      setError("Error al eliminar el tema");
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const filteredTemas = useMemo(() =>
    temas.filter(t => t.title.toLowerCase().includes(search.toLowerCase())),
    [temas, search]
  );

  const sortedTemas = useMemo(() => {
    if (!sortConfig) return filteredTemas;
    return [...filteredTemas].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Tema];
      const bVal = b[sortConfig.key as keyof Tema];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTemas, sortConfig]);

  const totalPages = Math.ceil(sortedTemas.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedTemas.slice(start, start + recordsPerPage);
  }, [sortedTemas, currentPage]);

  if (loading) {
    return (
        <div className="dashboard-container">
            <Skeleton width="260px" height="1.8rem" />
            <Skeleton width="200px" height="1.1rem" style={{ marginTop: "8px" }} />
            <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ display: "flex", gap: "1rem" }}>
                            <Skeleton width="40px" height="1rem" />
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
      <h1><span className="page-title-icon"><FiList /></span> Temas para Discursantes</h1>

      {error && <div className="error"><TbAlertTriangle /> {error}</div>}

      <h2 className="dashboard-subtitle">{form.id ? <><TbPencil /> Editar Tema</> : <><TbPlus /> Agregar Tema</>}</h2>
      <form onSubmit={handleSubmit} className="grid-form">
        <input
          type="text"
          placeholder="Título del tema"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />
        <div className="form-group full-width">
          <button type="submit" className="btn primary">
            {form.id ? "Actualizar" : "Agregar"}
          </button>
          {(form.id || form.title) && (
            <button type="button" className="btn cancel-btn" onClick={() => setForm({ id: "", title: "" })} title="Cancelar" aria-label="Cancelar">✕</button>
          )}
        </div>
      </form>

      <div className="grid-form" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Buscar tema..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("id")} className="sortable-header">
                #
                <span className="sort-icon">
                  {sortConfig?.key === "id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("title")} className="sortable-header">
                Título
                <span className="sort-icon">
                  {sortConfig?.key === "title" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.length > 0 ? (
              currentRecords.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.title}</td>
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
                <td colSpan={3}>No hay temas registrados.</td>
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
    </div>
  );
}
