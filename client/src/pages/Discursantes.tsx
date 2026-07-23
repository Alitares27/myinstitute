import { useEffect, useState, useMemo, useRef } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoSaveOutline } from "react-icons/io5";
import { FiMic } from "react-icons/fi";
import { TbAlertTriangle } from "react-icons/tb";
import { formatDate, toYMD } from "../utils/dateUtils";
import { Skeleton } from "../components/Skeleton";
import type { SpeakerRecord } from "../interfaces/Speaker";
import type { Member, Tema } from "../interfaces/Common";

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

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [loading, setLoading] = useState(true);

  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const [topicWarning, setTopicWarning] = useState<string | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

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

    Promise.all([
      Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") }),
      api.get("/speakers"),
      api.get("/students"),
      api.get("/temas"),
    ])
      .then(([userRes, spkRes, memRes, temasRes]) => {
        setRole(userRes.data.role);
        setSpeakers(spkRes.data);
        setMembers(memRes.data);
        setAllTemas(temasRes.data);
      })
      .catch(() => setError("Error al conectar con el servidor"))
      .finally(() => setLoading(false));
  }, []);

  const membersWithSpeeches = useMemo(() => {
    const speakerIds = new Set(speakers.map(s => s.member_id));
    return members.filter(m => speakerIds.has(m.id));
  }, [members, speakers]);

  const filteredSpeakers = useMemo(() => {
    return speakers.filter(s => {
      const matchMember = memberFilter ? s.member_id === Number(memberFilter) : true;
      const matchDate = dateFilter ? toYMD(s.date) === dateFilter : true;
      return matchMember && matchDate;
    });
  }, [speakers, memberFilter, dateFilter]);

  const sortedSpeakers = useMemo(() => {
    if (!sortConfig) return filteredSpeakers;
    return [...filteredSpeakers].sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof SpeakerRecord];
      let bVal: any = b[sortConfig.key as keyof SpeakerRecord];

      if (sortConfig.key === "date") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortConfig.key === "member_id") {
        aVal = (a.member_name || members.find(m => m.id === a.member_id)?.name || "").toLowerCase();
        bVal = (b.member_name || members.find(m => m.id === b.member_id)?.name || "").toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSpeakers, sortConfig, members]);

  const totalPages = Math.ceil(sortedSpeakers.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedSpeakers.slice(start, start + recordsPerPage);
  }, [sortedSpeakers, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch {
      alert("Error al procesar la solicitud.");
    }
  };

  const handleEdit = (s: SpeakerRecord) => {
    setEditingId(s.id);
    setForm({
      member_id: String(s.member_id),
      tema_id: String(s.tema_id),
      speech_title: s.speech_title || "",
      time: String(s.time || 10),
      date: toYMD(s.date),
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

  useEffect(() => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (!form.member_id) { setSpeechWarning(null); return; }
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
      const msg = `Alerta: Este miembro discursó hace ${daysAgo} días (${formatDate(mostRecent.date, { weekday: 'short', day: 'numeric', month: 'short' })}).`;
      setSpeechWarning(msg);
      speechTimerRef.current = setTimeout(() => setSpeechWarning(null), 5000);
    } else {
      setSpeechWarning(null);
    }
    return () => { if (speechTimerRef.current) clearTimeout(speechTimerRef.current); };
  }, [form.member_id, speakers]);

  useEffect(() => {
    if (topicTimerRef.current) clearTimeout(topicTimerRef.current);
    if (!form.tema_id) { setTopicWarning(null); return; }
    const temaIdNum = Number(form.tema_id);

    const pastTopics = speakers.filter(s => s.tema_id === temaIdNum && s.id !== editingId);

    if (pastTopics.length > 0) {
      pastTopics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const mostRecent = pastTopics[0];
      const today = new Date();
      const daysAgo = Math.floor((today.getTime() - new Date(mostRecent.date).getTime()) / (1000 * 3600 * 24));

      const timeStr = daysAgo >= 0
        ? `hace ${daysAgo} días`
        : `está programado para dentro de ${Math.abs(daysAgo)} días`;

      const msg = `Alerta: Este tema ya fue elegido. ${timeStr} (${formatDate(mostRecent.date, { weekday: 'short', day: 'numeric', month: 'short' })}).`;
      setTopicWarning(msg);
      topicTimerRef.current = setTimeout(() => setTopicWarning(null), 5000);
    } else {
      setTopicWarning(null);
    }
    return () => { if (topicTimerRef.current) clearTimeout(topicTimerRef.current); };
  }, [form.tema_id, speakers, editingId]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Skeleton width="260px" height="1.8rem" />
        <Skeleton width="180px" height="1.1rem" style={{ marginTop: "8px" }} />
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Skeleton height="1rem" width="120px" />
                  <Skeleton height="0.75rem" width="80px" />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Skeleton height="1rem" width="70px" />
                  <Skeleton height="0.75rem" width="50px" />
                </div>
                <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Skeleton height="1rem" width="140px" />
                  <Skeleton height="0.75rem" width="100px" />
                </div>
                <Skeleton width="70px" height="1.8rem" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) return <p className="error-message"><TbAlertTriangle /> {error}</p>;

  return (
    <div className="dashboard-container">
      <h1><span className="page-title-icon"><FiMic /></span> Control de Discursantes</h1>

      {(speechWarning || topicWarning) && (
        <div className="warning-toast-container">
          {speechWarning && (
            <div className="warning-toast"><TbAlertTriangle /> {speechWarning}</div>
          )}
          {topicWarning && (
            <div className="warning-toast"><TbAlertTriangle /> {topicWarning}</div>
          )}
        </div>
      )}

      {role === "admin" && (
        <section>
          <h2 className="dashboard-subtitle">{editingId ? <><IoCreateOutline /> Actualizar</> : <><FaPlus /> Asignar</>}</h2>
          <form className="grid-form" onSubmit={handleSubmit}>
            <div className="form-group">
              
              <select required value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}>
                <option value="">Elegir Miembro</option>
                {members.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
              </select>
            </div>

            <div className="form-group">
             
              <select required value={form.tema_id} onChange={e => setForm({ ...form, tema_id: e.target.value })}>
                <option value="">Elegir Tema</option>
                {allTemas.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
              </select>
            </div>

            <div className="form-group">
              
              <input type="text" placeholder="Ej. El valor de la perseverancia" value={form.speech_title} onChange={e => setForm({ ...form, speech_title: e.target.value })} required />
            </div>

            <div className="form-group">

              <input type="number" placeholder="Ingresa tiempo"  value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div className="form-group">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>


            {editingId && (
              <div className="form-group">
                <label>Estado</label>
                <select value={form.completed} onChange={e => setForm({ ...form, completed: e.target.value })}>
                  <option value="No">No</option>
                  <option value="Si">Si</option>
                </select>
              </div>
            )}

            <div className="form-group full-width">
              <button type="submit" className="btn primary">
                {editingId ? <><IoSaveOutline /> Guardar</> : <><FaPlus /> Asignar</>}
              </button>
              {(editingId || form.member_id || form.tema_id || form.speech_title) && (
                <button type="button" className="btn cancel-btn" onClick={() => { setEditingId(null); setForm({ member_id: "", tema_id: "", speech_title: "", time: "10", date: new Date().toISOString().split("T")[0], completed: "No" }); }} title="Cancelar" aria-label="Cancelar">✕</button>
              )}
            </div>
          </form>
        </section>
      )}

      <h2 className="dashboard-subtitle">Historial de Discursos</h2>

      <div className="grid-form extracted-style-2">
        <select value={memberFilter} onChange={e => { setMemberFilter(e.target.value); setCurrentPage(1); }}>
          <option value="">Todos los miembros ({membersWithSpeeches.length})</option>
          {membersWithSpeeches.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }} />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("member_id")} className="sortable-header">
                Miembro / Fecha
                <span className="sort-icon">
                  {sortConfig?.key === "member_id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("completed")} className="sortable-header">
                Estado
                <span className="sort-icon">
                  {sortConfig?.key === "completed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("topic")} className="sortable-header">
                Tema / Discurso
                <span className="sort-icon">
                  {sortConfig?.key === "topic" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
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
                    {formatDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </td>
                <td>
                  <span className={s.completed === "Si" ? "status-present" : "status-absent"}>
                    {s.completed === "Si" ? <><IoCheckmarkCircleOutline /> Cumplido</> : "Pendiente"}
                  </span>
                  <div className="flex-icon-text">
                    <IoTimeOutline /> {s.time || 0} min
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
                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(s)} aria-label="Editar">
                      <IoCreateOutline />
                    </button>
                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(s.id)} aria-label="Eliminar">
                      <IoTrashOutline />
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