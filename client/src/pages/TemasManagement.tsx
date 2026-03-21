import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import axios from "axios";

interface Tema {
  id: number;
  title: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TemasManagement() {
  const navigate = useNavigate();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: "", title: "" });
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

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
      const token = sessionStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/temas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTemas(res.data);
    } catch {
      setError("Error al cargar los temas");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (form.id) {
        const res = await axios.put(`${API_BASE_URL}/temas/${form.id}`, { title: form.title }, config);
        setTemas(prev => prev.map(t => t.id === Number(form.id) ? res.data : t));
      } else {
        const res = await axios.post(`${API_BASE_URL}/temas`, { title: form.title }, config);
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
    const token = sessionStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE_URL}/temas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  return (
    <div className="dashboard-container">
      <h1>🗂️ Temas para Discursantes</h1>

      {error && <div className="error">⚠️ {error}</div>}

      <h2 className="dashboard-subtitle">{form.id ? "✏️ Editar Tema" : "➕ Agregar Tema"}</h2>
      <form onSubmit={handleSubmit} className="grid-form">
        <input
          type="text"
          placeholder="Título del tema"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />
        <button type="submit" className="btn primary">
          {form.id ? "Actualizar" : "Agregar"}
        </button>
        {form.id && (
          <button type="button" className="btn secondary" onClick={() => setForm({ id: "", title: "" })}>
            Cancelar
          </button>
        )}
      </form>

      <div className="grid-form" style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar tema..."
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
