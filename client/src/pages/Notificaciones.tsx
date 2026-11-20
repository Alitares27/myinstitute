import { useEffect,useState } from "react";
import api from "../api";
import FormModal from "../components/FormModal";
import { IoCreateOutline } from "react-icons/io5";
type Settings={activity_days:number;meeting_days:number;attendance_day:number;attendance_time:string;time_zone:string;activities_enabled:boolean;meetings_enabled:boolean;attendance_enabled:boolean};
const days=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
export default function Notificaciones({embedded=false}:{embedded?:boolean}){
  const [settings,setSettings]=useState<Settings|null>(null),[draft,setDraft]=useState<Settings|null>(null);
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();api.get<Settings>("/notifications/settings",{signal:controller.signal}).then(({data})=>{setSettings({...data,attendance_time:data.attendance_time.slice(0,5)});}).catch(()=>{if(!controller.signal.aborted)setError("No se pudo cargar la configuración.");});return()=>controller.abort();},[]);
  async function save(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    try{const {data}=await api.put<Settings>("/notifications/settings",draft);setSettings({...data,attendance_time:data.attendance_time.slice(0,5)});setDraft(null);setMessage("Configuración guardada.");window.dispatchEvent(new window.Event("notifications:settings"));}
    catch{setError("No se pudo guardar la configuración. Revisa los datos e inténtalo de nuevo.");}finally{setBusy(false);}
  }
  return <section className="dashboard-container">
    <header className="audit-header">{embedded?<h2>Notificaciones</h2>:<h1>Notificaciones</h1>}{settings&&<button type="button" className="btn secondary" onClick={()=>{setError("");setDraft({...settings});}}><IoCreateOutline aria-hidden="true"/>Configurar</button>}</header>
    <p>Recordatorios de la aplicación para todos los usuarios, según sus permisos. Solo los administradores pueden modificar estas opciones.</p>
    {error&&!draft&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {!settings&&!error&&<p role="status">Cargando configuración…</p>}
    {settings&&<dl className="record-details">
      <div><dt>Actividades</dt><dd>{settings.activities_enabled?`${settings.activity_days} días antes`:"Desactivadas"}</dd></div>
      <div><dt>Consejos</dt><dd>{settings.meetings_enabled?`${settings.meeting_days} días antes`:"Desactivados"}</dd></div>
      <div><dt>Asistencia</dt><dd>{settings.attendance_enabled?`${days[settings.attendance_day]}, ${settings.attendance_time} h`:"Desactivada"}</dd></div>
      <div><dt>Zona horaria</dt><dd>{settings.time_zone}</dd></div>
    </dl>}
    {draft&&<FormModal title="Configurar recordatorios" busy={busy} onClose={()=>setDraft(null)}>
      {error&&<p role="alert">{error}</p>}
      <form onSubmit={save} className="notification-settings-form">
        <fieldset disabled={busy}><legend>Actividades</legend><label><input type="checkbox" checked={draft.activities_enabled} onChange={e=>setDraft({...draft,activities_enabled:e.target.checked})}/> Activar recordatorio</label><label className="form-group">Días de anticipación<input required type="number" min={0} max={365} value={draft.activity_days} onChange={e=>setDraft({...draft,activity_days:Number(e.target.value)})}/></label></fieldset>
        <fieldset disabled={busy}><legend>Consejos</legend><label><input type="checkbox" checked={draft.meetings_enabled} onChange={e=>setDraft({...draft,meetings_enabled:e.target.checked})}/> Activar recordatorio</label><label className="form-group">Días de anticipación<input required type="number" min={0} max={365} value={draft.meeting_days} onChange={e=>setDraft({...draft,meeting_days:Number(e.target.value)})}/></label></fieldset>
        <fieldset disabled={busy}><legend>Asistencia de cursos</legend><label><input type="checkbox" checked={draft.attendance_enabled} onChange={e=>setDraft({...draft,attendance_enabled:e.target.checked})}/> Activar recordatorio</label><label className="form-group">Día de la semana<select value={draft.attendance_day} onChange={e=>setDraft({...draft,attendance_day:Number(e.target.value)})}>{days.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></label><label className="form-group">Hora<input required type="time" value={draft.attendance_time} onChange={e=>setDraft({...draft,attendance_time:e.target.value})}/></label></fieldset>
        <label className="form-group">Zona horaria<input required value={draft.time_zone} onChange={e=>setDraft({...draft,time_zone:e.target.value})}/><small>Ejemplo: America/Argentina/Buenos_Aires</small></label>
        <button type="submit" className="btn primary" disabled={busy}>{busy?"Guardando…":"Guardar"}</button>
      </form>
    </FormModal>}
  </section>;
}
