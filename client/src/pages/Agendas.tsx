import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { IoAddOutline, IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import api from "../api";
import { confirmAppAction } from "../components/AppDialogHost";
import FormModal from "../components/FormModal";
import "../styles/Agendas.css";

const agendaFields = [
  { key: "opening_hymn", label: "1.º Himno", kind: "text" },
  { key: "opening_prayer_id", label: "1.ª Oración", kind: "member" },
  { key: "baptism_talk_id", label: "Discurso de Bautismo", kind: "member" },
  { key: "baptism_id", label: "Ordenanza / Bautismo", kind: "member" },
  { key: "witness_one_id", label: "Testigo 1", kind: "member" },
  { key: "witness_two_id", label: "Testigo 2", kind: "member" },
  { key: "holy_ghost_talk_id", label: "Discurso de Espíritu Santo", kind: "member" },
  { key: "confirmation_id", label: "Ordenanza / Confirmación", kind: "member" },
  { key: "closing_hymn", label: "2.º Himno", kind: "text" },
  { key: "closing_prayer_id", label: "2.ª Oración", kind: "member" },
] as const;

type AgendaField = typeof agendaFields[number]["key"];
type Draft = Record<AgendaField | "friend" | "scheduled_at", string>;
type Agenda = Record<AgendaField, number | string | null> & {
  id: number;
  friend: string;
  scheduled_at: string;
  member_names?: Record<string, string>;
};
type Member = { id: number; name: string };

function createDraft(agenda?: Agenda): Draft {
  const fields = Object.fromEntries(agendaFields.map(({ key }) => [key, String(agenda?.[key] ?? "")]));
  return { ...fields, friend: agenda?.friend ?? "", scheduled_at: agenda?.scheduled_at ?? "" } as Draft;
}

function formatDate(value: string) {
  const [date, time] = value.split("T");
  return `${date.split("-").reverse().join("/")} ${time}`;
}

export default function Agendas() {
  const admin = JSON.parse(localStorage.getItem("user") || "{}")?.role === "admin";
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(admin);
  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");
  const [formError, setFormError] = useState("");
  const [editor, setEditor] = useState<{ id?: number; draft: Draft } | null>(null);
  const [detail, setDetail] = useState<Agenda | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    api.get<Agenda[]>("/agendas", { signal })
      .then(({ data }) => { if (!signal.aborted) setAgendas(data); })
      .catch(error => {
        if (!signal.aborted) {
          setError(error.response?.status === 503
            ? "Agendas todavía no está habilitada en el servidor."
            : "No se pudieron cargar las agendas.");
        }
      })
      .finally(() => { if (!signal.aborted) setLoading(false); });
    if (admin) {
      api.get<Member[]>("/agendas/members", { signal })
        .then(({ data }) => { if (!signal.aborted) setMembers(data); })
        .catch(() => { if (!signal.aborted) setMembersError("No se pudo cargar la lista de miembros."); })
        .finally(() => { if (!signal.aborted) setMembersLoading(false); });
    }
    return () => controller.abort();
  }, [admin]);

  const memberNames = new Map(members.map(member => [String(member.id), member.name]));
  function memberName(agenda: Agenda, value: string | number | null) {
    if (!value) return "Sin asignar";
    return memberNames.get(String(value)) ?? agenda.member_names?.[value] ?? "Miembro asignado";
  }

  function openEditor(agenda?: Agenda) {
    setFormError("");
    setEditor({ id: agenda?.id, draft: createDraft(agenda) });
  }

  function update(key: keyof Draft, value: string) {
    setEditor(previous => previous && { ...previous, draft: { ...previous.draft, [key]: value } });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    const { id, draft } = editor;
    const payload = { ...draft, friend: draft.friend.trim() };
    if (!payload.friend) {
      setFormError("Ingresa el nombre del amigo.");
      return;
    }
    setFormError("");
    setBusy(true);
    try {
      const { data } = id === undefined
        ? await api.post<Agenda>("/agendas", payload)
        : await api.put<Agenda>(`/agendas/${id}`, payload);
      setAgendas(previous => id === undefined
        ? [...previous, data]
        : previous.map(row => row.id === id ? { ...row, ...data, id } : row));
      setEditor(null);
    } catch (error: any) {
      setFormError(error.response?.data?.message || error.message || "No se pudo guardar la agenda.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(agenda: Agenda) {
    if (!await confirmAppAction(`¿Eliminar la agenda de ${agenda.friend}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api.delete(`/agendas/${agenda.id}`);
      setAgendas(previous => previous.filter(row => row.id !== agenda.id));
    } catch (error: any) {
      setError(error.response?.data?.message || "No se pudo eliminar la agenda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-container">
      <div className="asistencia-header">
        <div className="asistencia-header-info">
          <h1>Agendas</h1>
          <p>Programación de bautismos y confirmaciones.</p>
        </div>
        {admin && <button type="button" className="btn primary mobile-add" aria-label="Agregar agenda" disabled={busy || loading} onClick={() => openEditor()}>
          <IoAddOutline aria-hidden="true" /> <span>Agregar</span>
        </button>}
      </div>

      {loading && <p role="status">Cargando agendas…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="table-container">
        <table>
          <thead><tr>
            <th scope="col">Amigo</th>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Ordenanza</th>
            {admin && <th scope="col">Acciones</th>}
          </tr></thead>
          <tbody>
            {[...agendas].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at) || b.id - a.id).map(agenda => (
              <tr key={agenda.id}>
                <td><button type="button" className="btn secondary" onClick={() => setDetail(agenda)}>{agenda.friend}</button></td>
                <td><time dateTime={agenda.scheduled_at}>{formatDate(agenda.scheduled_at)}</time></td>
                <td>
                  <div>Bautismo: {memberName(agenda, agenda.baptism_id)}</div>
                  <div>Confirmación: {memberName(agenda, agenda.confirmation_id)}</div>
                </td>
                {admin && <td><div className="miembros-row-actions">
                  <button type="button" className="btn secondary btn-icon" disabled={busy} aria-label={`Editar bautismo de ${agenda.friend}`} onClick={() => openEditor(agenda)}>
                    <IoCreateOutline aria-hidden="true" />
                  </button>
                  <button type="button" className="btn secondary btn-icon danger-outline" disabled={busy} aria-label={`Eliminar agenda de ${agenda.friend}`} onClick={() => void remove(agenda)}>
                    <IoTrashOutline aria-hidden="true" />
                  </button>
                </div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && agendas.length === 0 && <p>Todavía no hay agendas registradas.</p>}

      {editor && <FormModal title={editor.id === undefined ? "Agregar agenda" : "Editar agenda"} busy={busy} onClose={() => setEditor(null)}>
        {membersLoading && <p role="status">Cargando miembros…</p>}
        {membersError && <p role="alert">{membersError}</p>}
        {formError && <p role="alert">{formError}</p>}
        <form onSubmit={save}>
          <fieldset className="agenda-form-fields" disabled={busy}>
            <div className="agenda-form-grid">
              <label className="form-group">Fecha y hora
                <input type="datetime-local" required value={editor.draft.scheduled_at} onChange={event => update("scheduled_at", event.target.value)} />
              </label>
              <label className="form-group">Amigo
                <input required maxLength={150} value={editor.draft.friend} onChange={event => update("friend", event.target.value)} />
              </label>
              {agendaFields.map(({ key, label, kind }) => {
                const value = editor.draft[key];
                return <label className="form-group" key={key}>{label}
                  {kind === "text" ? (
                    <input maxLength={150} value={value} onChange={event => update(key, event.target.value)} />
                  ) : (
                    <select value={value} disabled={membersLoading || !!membersError} onChange={event => update(key, event.target.value)}>
                      <option value="">Sin asignar</option>
                      {value && !memberNames.has(value) && (
                        <option value={value}>{agendas.find(row => row.id === editor.id)?.member_names?.[value] ?? "Miembro asignado"}</option>
                      )}
                      {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  )}
                </label>;
              })}
            </div>
            <div className="agenda-form-actions">
              <button type="submit" className="btn primary">{busy ? "Guardando…" : "Guardar"}</button>
            </div>
          </fieldset>
        </form>
      </FormModal>}

      {detail && <FormModal title={`Bautismo de ${detail.friend}`} onClose={() => setDetail(null)}>
        <dl className="agenda-details">
          <div className="agenda-details-date">
            <dt>Fecha y hora</dt>
            <dd><time dateTime={detail.scheduled_at}>{formatDate(detail.scheduled_at)}</time></dd>
          </div>
          {agendaFields.map(({ key, label, kind }) => (
            <div key={key}><dt>{label}</dt>
              <dd>{kind === "member" ? memberName(detail, detail[key]) : detail[key] || "Sin indicar"}</dd>
            </div>
          ))}
        </dl>
      </FormModal>}
    </div>
  );
}
