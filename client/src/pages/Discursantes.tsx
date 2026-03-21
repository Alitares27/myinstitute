import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { FaPlus, FaCheckCircle, FaClock, FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";

interface SpeakerRecord {
  id: number;
  member_id: number;
  member_name?: string;
  topic?: string;
  tema_id: number;
  speech_title: string;
  time: number;
  date: string;
  assigned: string;
  completed: string;
}

interface Member { id: number; name: string; }
interface Tema { id: number; title: string; }

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Speakers() {
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allTemas, setAllTemas] = useState<Tema[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 6;

  const [form, setForm] = useState({
    member_id: "",
    tema_id: "",
    speech_title: "",
    time: "10",
    date: new Date().toISOString().split("T")[0],
    completed: "No",
  });

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") }),
      api.get(`${API_BASE_URL}/speakers`),
      api.get(`${API_BASE_URL}/students`),
      api.get(`${API_BASE_URL}/temas`),
    ])
      .then(([userRes, spkRes, memRes, temasRes]) => {
        setRole(userRes.data.role);
        setSpeakers(spkRes.data);
        setMembers(memRes.data);
        setAllTemas(temasRes.data);
      })
      .catch(() => setError("Error al conectar con el servidor"));
  }, []);

  const filteredSpeakers = useMemo(() => {
    return speakers.filter(s => {
      const matchMember = memberFilter ? s.member_id === Number(memberFilter) : true;
      const matchDate = dateFilter ? new Date(s.date).toISOString().split("T")[0] === dateFilter : true;
      return matchMember && matchDate;
    });
  }, [speakers, memberFilter, dateFilter]);

  const totalPages = Math.ceil(filteredSpeakers.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filteredSpeakers.slice(start, start + recordsPerPage);
  }, [filteredSpeakers, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (editingId) {
        const res = await api.put(`/speakers/${editingId}`, form);
        setSpeakers(prev => prev.map(s => s.id === editingId ? {
          ...res.data,
          topic: allTemas.find(t => t.id === Number(form.tema_id))?.title,
          member_name: members.find(m => m.id === Number(form.member_id))?.name,
          completed: form.completed
        } : s));
        setEditingId(null);
      } else {
        const res = await api.post(`/speakers`, { ...form, completed: "No" });
        setSpeakers(prev => [{
          ...res.data,
          topic: allTemas.find(t => t.id === Number(form.tema_id))?.title,
          member_name: members.find(m => m.id === Number(form.member_id))?.name,
          completed: "No"
        }, ...prev]);
      }
      setForm({ member_id: "", tema_id: "", speech_title: "", time: "10", date: new Date().toISOString().split("T")[0], completed: "No" });
    } catch (err) {
      alert("Error al procesar la solicitud.");
    }
  };

  const handleEdit = (s: SpeakerRecord) => {
    setEditingId(s.id);
    let validatedDate = new Date().toISOString().split("T")[0];
    if (s.date) {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) validatedDate = d.toISOString().split("T")[0];
    }
    setForm({
      member_id: String(s.member_id),
      tema_id: String(s.tema_id),
      speech_title: s.speech_title || "",
      time: String(s.time || 10),
      date: validatedDate,
      completed: s.completed || "No",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api.delete(`/speakers/${id}`);
      setSpeakers(prev => prev.filter(s => s.id !== id));
    } catch { alert("Error al eliminar"); }
  };

  if (error) return <p className="error-message">⚠️ {error}</p>;

  const recentSpeechWarning = useMemo(() => {
    if (!form.member_id) return null;
    const memberIdNum = Number(form.member_id);
    const today = new Date();
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const recentSpeeches = speakers.filter(s => {
      if (s.member_id !== memberIdNum || s.completed !== "Si") return false;
      const speechDate = new Date(s.date);
      return speechDate >= sixtyDaysAgo && speechDate <= today;
    });

    if (recentSpeeches.length > 0) {
      recentSpeeches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const mostRecent = recentSpeeches[0];
      const daysAgo = Math.floor((today.getTime() - new Date(mostRecent.date).getTime()) / (1000 * 3600 * 24));
      return `⚠️ Atención: Este miembro discursó hace ${daysAgo} días (${new Date(mostRecent.date).toLocaleDateString('es-ES')}).`;
    }
    return null;
  }, [form.member_id, speakers]);

  return (
    <div className="dashboard-container">
      <h1>🎙️ Control de Discursantes</h1>

      {role === "admin" && (
        <section>
          <h2 className="dashboard-subtitle">{editingId ? "<FaEdit /> Actualizar" : "➕ Asignar"}</h2>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Miembro</label>
              <select required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}>
                <option value="">Seleccionar Miembro...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {recentSpeechWarning && (
                <div className="extracted-style-29" style={{ marginTop: '10px', fontSize: '0.85rem', padding: '10px' }}>
                  {recentSpeechWarning}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Tema</label>
              <select required value={form.tema_id} onChange={e => setForm({ ...form, tema_id: e.target.value })}>
                <option value="">Seleccionar Tema...</option>
                {allTemas.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Discurso</label>
              <input type="text" placeholder="Ej. El valor de la perseverancia" value={form.speech_title} onChange={e => setForm({ ...form, speech_title: e.target.value })} required />
            </div>

            <div className="form-group">

              <label>Tiempo</label>
              <input type="number" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>


            {editingId && (
              <div className="form-group">
                <label>Estado</label>
                <select value={form.completed} onChange={e => setForm({ ...form, completed: e.target.value })}>
                  <option value="No">Pendiente</option>
                  <option value="Si">Cumplido</option>
                </select>
              </div>
            )}

            <div className="extracted-style-1">
              <button type="submit" className="btn primary">
                {editingId ? <><FaSave /> Guardar</> : <><FaPlus /> Asignar</>}
              </button>
              {editingId && (
                <button type="button" className="btn secondary" onClick={() => { setEditingId(null); setForm({ ...form, member_id: "", tema_id: "", speech_title: "" }); }}>
                  <FaTimes />
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <h2 className="dashboard-subtitle">Historial de Discursos</h2>

      {/* FILTROS */}
      <div className="grid-form extracted-style-2">
        <select value={memberFilter} onChange={e => { setMemberFilter(e.target.value); setCurrentPage(1); }}>
          <option value="">Todos los miembros</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Miembro / Fecha</th>
              <th>Estado</th>
              <th>Tema / Discurso</th>
              {role === "admin" && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {currentRecords.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="extracted-style-20">
                    {s.member_name || members.find(m => m.id === s.member_id)?.name}
                  </div>
                  <div className="text-muted-sm">
                    {(() => {
                      const d = new Date(s.date);
                      return !isNaN(d.getTime())
                        ? d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
                        : "Sin fecha";
                    })()}
                  </div>
                </td>
                <td>
                  <span className={s.completed === "Si" ? "status-present" : "status-absent"}>
                    {s.completed === "Si" ? <><FaCheckCircle /> Cumplido</> : "Pendiente"}
                  </span>
                  <div className="flex-icon-text">
                    <FaClock /> {s.time || 0} min
                  </div>
                </td>
                <td>
                  <div className="flex-icon-text">{s.topic}</div>
                  <div className="extracted-style-24">
                    "{s.speech_title}"
                  </div>
                </td>
                {role === "admin" && (
                  <td>
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(s)}>
                      <FaEdit />
                    </button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(s.id)}>
                      <FaTrash />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {currentRecords.length === 0 && (
              <tr>
                <td colSpan={role === "admin" ? 4 : 3} >No hay registros que coincidan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="pagination-dropdown">
          <span className="extracted-style-8">PÁGINA:</span>
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="extracted-style-9"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}