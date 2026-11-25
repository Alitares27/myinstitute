import {speakerSelectionWarnings} from "../utils/speakerWarnings";
import SpeechSearch, {officialReferenceLink} from "../components/SpeechSearch";
import type {SpeechReference} from "../interfaces/SpeechReference";
import RecordActions from "../components/RecordActions";
import { TABLE_PAGE_SIZE } from "../shared/constants";
import Pagination from "../components/Pagination";
import { ViewRecordButton } from "../components/RecordDetails";
import { IoSearchOutline, IoAddOutline } from "react-icons/io5";
import FormModal from "../components/FormModal";
import "../styles/Discursantes.css";
import { confirmAppAction } from "../components/AppDialogHost";
import { useEffect, useState, useMemo, useRef } from "react";
import api from "../api";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoSaveOutline } from "react-icons/io5";
import { FiMic } from "react-icons/fi";
import { TbAlertTriangle, TbList } from "react-icons/tb";
import { businessDate, formatDate, parseLocalDate, toYMD } from "../utils/utilidadesFecha";
import { Skeleton } from "../components/Esqueleto";
import type { SpeakerRecord } from "../interfaces/Speaker";
import type { Member, Tema } from "../interfaces/Common";
import { useLocation, useNavigate } from "react-router-dom";

function SpeakerStatus({ completed }: { completed: SpeakerRecord["completed"] }) {
  return <span className={completed === "Si" ? "status-present" : "status-absent"}>
    {completed === "Si" ? <><IoCheckmarkCircleOutline aria-hidden="true" /> Cumplido</> : "Pendiente"}
  </span>;
}

export default function Speakers() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchFromForm,setSearchFromForm]=useState(false);
  const [reference,setReference]=useState<SpeechReference|null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerRecord | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allTemas, setAllTemas] = useState<Tema[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = TABLE_PAGE_SIZE;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [loading, setLoading] = useState(true);

  const [topicWarning, setTopicWarning] = useState<string | null>(null);
  const topicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showTemasModal, setShowTemasModal] = useState(false);
  const [temaTitle, setTemaTitle] = useState("");
  const [editingTemaId, setEditingTemaId] = useState<number | null>(null);
  const [savingTema, setSavingTema] = useState(false);
  const [temaError, setTemaError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.openTopicManager) {
      setShowTemasModal(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.key, location.pathname, location.state, navigate]);

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
    speech_reference_id: "",
    time: "10",
    date: businessDate(),
    completed: "No",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const session=JSON.parse(localStorage.getItem("user") || "{}");

    Promise.all([
      Promise.resolve({ data: session }),
      api.get("/speakers"),
      session.role==='admin'?api.get<Member[]>("/speakers/members"):Promise.resolve({data:[]}),
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

  const memberOptions = useMemo(() => {
    const options=new Map(members.map(member=>[String(member.id),member]));
    for(const speaker of speakers)if(!options.has(String(speaker.member_id)))options.set(String(speaker.member_id),{id:Number(speaker.member_id),name:speaker.member_name||'Miembro'});
    return [...options.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id-b.id);
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
          speech_author:reference?.author,speech_conference:reference?.conference,speech_url:reference?.url,
          topic: allTemas.find(t => t.id === Number(form.tema_id))?.title,
          member_name: members.find(m => m.id === Number(form.member_id))?.name,
          completed: form.completed
        } : s));
        setEditingId(null);
      } else {
        const res = await api.post(`/speakers`, { ...form, completed: "No" });
        setSpeakers(prev => [{
          ...res.data,
          speech_author:reference?.author,speech_conference:reference?.conference,speech_url:reference?.url,
          topic: allTemas.find(t => t.id === Number(form.tema_id))?.title,
          member_name: members.find(m => m.id === Number(form.member_id))?.name,
          completed: "No"
        }, ...prev]);
      }
      setFormOpen(false);setReference(null);
      setForm({ member_id: "", tema_id: "", speech_title: "", speech_reference_id: "", time: "10", date: businessDate(), completed: "No" });
    } catch {
      alert("Error al procesar la solicitud.");
    }
  };

  const handleEdit = (s: SpeakerRecord) => {
      setFormOpen(true);
    setEditingId(s.id);
    setReference(s.speech_reference_id?{id:s.speech_reference_id,title:s.speech_title,author:s.speech_author||"",conference:s.speech_conference||"",url:s.speech_url||"",topics:[]}:null);
    setForm({
      member_id: String(s.member_id),
      tema_id: String(s.tema_id),
      speech_title: s.speech_title || "",
      speech_reference_id: s.speech_reference_id?String(s.speech_reference_id):"",
      time: String(s.time || 10),
      date: toYMD(s.date),
      completed: s.completed || "No",
    });
  };

  const handleDelete = async (id: number) => {
    if (!await confirmAppAction("¿Eliminar este registro?")) return;
    try {
      await api.delete(`/speakers/${id}`);
      setSpeakers(prev => prev.filter(s => s.id !== id));
    } catch { alert("Error al eliminar"); }
  };

  const resetTema = () => {
    setEditingTemaId(null);
    setTemaTitle("");
    setTemaError(null);
  };

  const handleSaveTema = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = temaTitle.trim();
    if (!title || savingTema) return;
    setSavingTema(true);
    setTemaError(null);
    try {
      if (editingTemaId === null) {
        const { data } = await api.post("/temas", { title });
        setAllTemas(prev => [...prev, data]);
      } else {
        await api.put(`/temas/${editingTemaId}`, { title });
        setAllTemas(prev => prev.map(tema => tema.id === editingTemaId ? { ...tema, title } : tema));
        setSpeakers(prev => prev.map(speaker => Number(speaker.tema_id) === editingTemaId ? { ...speaker, topic: title } : speaker));
      }
      resetTema();
    } catch {
      setTemaError(editingTemaId === null ? "Error al agregar el tema" : "Error al editar el tema");
    } finally {
      setSavingTema(false);
    }
  };

  const handleDeleteTema = async (id: number) => {
    if (!await confirmAppAction("¿Eliminar este tema?")) return;
    try {
      await api.delete(`/temas/${id}`);
      setAllTemas(prev => prev.filter(t => t.id !== id));
    } catch {
      setTemaError("Error al eliminar el tema");
    }
  };

  const {previousSpeech,recentMember,daysAgo}=speakerSelectionWarnings(speakers,{...form,speech_url:reference?.url},editingId,businessDate());

  useEffect(() => {
    if (topicTimerRef.current) clearTimeout(topicTimerRef.current);
    if (!form.tema_id) { setTopicWarning(null); return; }
    const temaIdNum = Number(form.tema_id);

    const pastTopics = speakers.filter(s => s.tema_id === temaIdNum && s.id !== editingId);

    if (pastTopics.length > 0) {
      pastTopics.sort((a, b) => b.date.localeCompare(a.date));
      const mostRecent = pastTopics[0];
      const today = new Date();
      const daysAgo = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - (parseLocalDate(mostRecent.date)?.getTime() ?? today.getTime())) / (1000 * 3600 * 24));

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

  const memberName = (speaker: SpeakerRecord) =>
    speaker.member_name || members.find(member => member.id === speaker.member_id)?.name || "Miembro";

  return (
    <div className="dashboard-container speakers-page">
      <header className="speakers-header">
        <h1><span className="page-title-icon"><FiMic /></span> Control de Discursantes</h1>
        <div className="speakers-header-actions">
        <button type="button" className="btn secondary mobile-header-action speakers-search-button" aria-label="Buscar discurso" title="Buscar discurso" onClick={()=>{setSearchFromForm(false);setSearchOpen(true);}}><IoSearchOutline aria-hidden="true"/><span>Buscar discursos</span></button>
        {role === "admin" && (
          <button type="button" className="btn primary mobile-add" aria-label="Agregar discursante"
            onClick={() => {setReference(null);setFormOpen(true);}}>
            <IoAddOutline className="mobile-only-action-icon" aria-hidden="true" /> <span>Agregar</span>
          </button>
        )}
        {role === "admin" && <button type="button" className="btn secondary mobile-header-action speakers-topics-mobile"
          aria-label="Temas" onClick={() => setShowTemasModal(true)}>
          <TbList aria-hidden="true" />
        </button>}
        </div>
      </header>

      {topicWarning && (
        <div className="warning-toast-container">
          {topicWarning && (
            <div className="warning-toast"><TbAlertTriangle /> {topicWarning}</div>
          )}
        </div>
      )}

      {role === "admin" && (
        <>
          {formOpen && <FormModal title={editingId ? "Editar discursante" : "Agregar discursante"} onClose={() => { setEditingId(null); setForm({ member_id: "", tema_id: "", speech_title: "", speech_reference_id: "", time: "10", date: businessDate(), completed: "No" }); setFormOpen(false);setReference(null); }}>
            <form className="grid-form" onSubmit={handleSubmit}>
              {(previousSpeech||recentMember)&&<div className="full-width speaker-selection-warnings">
                {previousSpeech&&<p className="speaker-selection-warning speech-reuse-warning" role="alert"><TbAlertTriangle aria-hidden="true"/><span>Este discurso ya fue elegido para {memberName(previousSpeech)} el {formatDate(previousSpeech.date)}. Puedes continuar si deseas volver a asignarlo.</span></p>}
                {recentMember&&<p className="speaker-selection-warning speaker-recent-warning" role="alert"><TbAlertTriangle aria-hidden="true"/><span>Este discursante ya tiene una asignación en los últimos 30 días: {formatDate(recentMember.date)} ({daysAgo===0?'hoy':`hace ${daysAgo} días`}), {recentMember.completed==='Si'?'cumplida':'pendiente'}. Puedes continuar si deseas asignarlo nuevamente.</span></p>}
              </div>}

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

                <input type="text" placeholder="Ej. El valor de la perseverancia" value={form.speech_title} onChange={e => {setReference(null);setForm({ ...form, speech_title: e.target.value,speech_reference_id:"" });}} required />
              </div>

              <div className="form-group full-width"><button type="button" className="btn secondary" onClick={()=>{setSearchFromForm(true);setSearchOpen(true);}}><IoSearchOutline aria-hidden="true"/>Buscar discurso</button>
                {reference&&<div className="speech-reference-preview"><strong>{reference.title}</strong><p>{reference.author} · {reference.conference}</p>{officialReferenceLink(reference.url)&&<a href={officialReferenceLink(reference.url)!} target="_blank" rel="noopener noreferrer">Leer discurso</a>}<button type="button" className="btn secondary" onClick={()=>{setReference(null);setForm({...form,speech_reference_id:""});}}>Quitar referencia</button></div>}
              </div>
              <div className="form-group">

                <input type="number" placeholder="Ingresa tiempo" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
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
                  {editingId ? <>Guardar</> : <>Asignar</>}
                </button>
              </div>
            </form>
          </FormModal>}
        </>
      )}

      <h2 className="dashboard-subtitle">Historial de Discursos</h2>

      <div className="grid-form extracted-style-2">
        <select value={memberFilter} onChange={e => { setMemberFilter(e.target.value); setCurrentPage(1); }}>
          <option value="">Todos los miembros ({memberOptions.length})</option>
          {memberOptions.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }} />
        {role === "admin" && (
          <button type="button" className="btn secondary speakers-topics-desktop" onClick={() => setShowTemasModal(true)}>
            <TbList /> Temas
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort("member_id")} className="sortable-header">
                <span className="table-desktop-only">Miembro</span><span className="table-mobile-only">Miembro / Fecha</span>
                <span className="sort-icon">
                  {sortConfig?.key === "member_id" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th scope="col" className="table-desktop-only">Fecha</th>
              <th onClick={() => handleSort("completed")} className="sortable-header table-desktop-only">
                Estado
                <span className="sort-icon">
                  {sortConfig?.key === "completed" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th onClick={() => handleSort("topic")} className="sortable-header speakers-desktop-detail">
                Tema / Discurso
                <span className="sort-icon">
                  {sortConfig?.key === "topic" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </th>
              <th scope="col" className="table-desktop-only">Duración</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map(s => (
              <tr key={s.id}>
                <td>
                  {memberName(s)}
                  <div className="text-muted-sm speakers-mobile-date">
                    {formatDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </td>
                <td className="table-desktop-only">{formatDate(s.date)}</td>
                <td className="table-desktop-only">
                  <SpeakerStatus completed={s.completed} />
                </td>
                <td className="speakers-desktop-detail">
                  <div className="flex-icon-text">{s.topic}</div>
                  <div className="extracted-style-24">
                    "{s.speech_title}"
                  </div>
                </td>
                <td className="table-desktop-only">{s.time || 0} min</td>
                <td>
                  <RecordActions>
                    <ViewRecordButton label="Ver discurso" onClick={() => setSelectedSpeaker(s)} />
                    {role === "admin" && <>
                      <button type="button" className="btn secondary btn-icon" onClick={() => handleEdit(s)} aria-label="Editar">
                      <IoCreateOutline />
                      </button>
                      <button type="button" className="btn secondary btn-icon danger-outline" onClick={() => handleDelete(s.id)} aria-label="Eliminar">
                      <IoTrashOutline />
                      </button>
                    </>}
                  </RecordActions>
                </td>
              </tr>
            ))}
            {currentRecords.length === 0 && (
              <tr>
                <td colSpan={6} >No hay registros que coincidan</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
      {searchOpen&&<SpeechSearch temas={allTemas} initialTopic={searchFromForm?allTemas.find(t=>String(t.id)===form.tema_id)?.title||'':''} canManage={role==='admin'} onClose={()=>setSearchOpen(false)} onSelect={(chosen,topicId)=>{
        if(!searchFromForm){setEditingId(null);setForm({member_id:'',tema_id:topicId,speech_title:chosen.title,speech_reference_id:String(chosen.id),time:'10',date:businessDate(),completed:'No'});}
        else setForm(prev=>({...prev,tema_id:topicId||prev.tema_id,speech_title:chosen.title,speech_reference_id:String(chosen.id)}));
        setReference(chosen);setSearchOpen(false);setFormOpen(true);
      }}/>}
      {selectedSpeaker && <FormModal title="Detalles del discursante" onClose={() => setSelectedSpeaker(null)}>
        <dl className="speakers-details">
          <div className="speakers-details-date">
            <dt>Fecha</dt>
            <dd>
              <span>{formatDate(selectedSpeaker.date, { day: "numeric", month: "long", year: "numeric" })}</span>
              <SpeakerStatus completed={selectedSpeaker.completed} />
            </dd>
          </div>
          <div><dt>Miembro</dt><dd>{memberName(selectedSpeaker)}</dd></div>
          <div><dt>Tema</dt><dd>{selectedSpeaker.topic || "Sin tema"}</dd></div>
          <div><dt>Discurso</dt><dd>{selectedSpeaker.speech_title || "Sin título"}</dd></div>
          {selectedSpeaker.speech_author&&<div><dt>Autor</dt><dd>{selectedSpeaker.speech_author}</dd></div>}
          {selectedSpeaker.speech_conference&&<div><dt>Conferencia</dt><dd>{selectedSpeaker.speech_conference}</dd></div>}
          {selectedSpeaker.speech_url&&officialReferenceLink(selectedSpeaker.speech_url)&&<div><dt>Fuente oficial</dt><dd><a href={officialReferenceLink(selectedSpeaker.speech_url)!} target="_blank" rel="noopener noreferrer">Leer discurso</a></dd></div>}
          <div><dt>Tiempo</dt><dd>{selectedSpeaker.time ?? 0} min</dd></div>
        </dl>
      </FormModal>}
      {showTemasModal && (
        <FormModal title="Temas para discursantes" busy={savingTema} onClose={() => { resetTema(); setShowTemasModal(false); }}>
          <form onSubmit={handleSaveTema} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              aria-label={editingTemaId === null ? "Nuevo tema" : "Nombre del tema"}
              placeholder={editingTemaId === null ? "Nuevo tema…" : "Nombre del tema"}
              value={temaTitle}
              onChange={e => setTemaTitle(e.target.value)}
              style={{ flex: 1 }}
              disabled={savingTema}
              required
            />
            <button type="submit" className="btn primary mobile-inline-add" disabled={savingTema}
              aria-label={editingTemaId === null ? "Agregar tema" : "Guardar tema"}>
              {editingTemaId === null ? <FaPlus aria-hidden="true" /> : <IoSaveOutline aria-hidden="true" />}
            </button>
            {editingTemaId !== null && <button type="button" className="btn secondary" disabled={savingTema} onClick={resetTema}>Cancelar</button>}
          </form>

          {temaError && <div className="error-message" style={{ marginBottom: "0.5rem" }}>{temaError}</div>}

          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            {allTemas.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {allTemas.map(t => (
                  <li key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)" }}>
                    <span>{t.title}</span>
                    <div className="speakers-row-actions">
                      <button type="button" className="btn secondary btn-icon" disabled={savingTema}
                        aria-label={`Editar tema: ${t.title}`} onClick={() => { setEditingTemaId(t.id); setTemaTitle(t.title); setTemaError(null); }}>
                        <IoCreateOutline aria-hidden="true" />
                      </button>
                      <button type="button" className="btn secondary btn-icon danger-outline" disabled={savingTema || editingTemaId === t.id}
                        onClick={() => handleDeleteTema(t.id)} aria-label={`Eliminar tema: ${t.title}`}>
                        <IoTrashOutline aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No hay temas registrados.</p>
            )}
          </div>
        </FormModal>
      )}
    </div>
  );
}
