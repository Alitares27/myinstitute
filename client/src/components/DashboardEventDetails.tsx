import { RecordDetails } from "./RecordDetails";
import type { UpcomingEvent } from "../utils/upcomingEvents";
import { formatDate,formatDateTimeLong } from "../utils/utilidadesFecha";

const meetingStatuses:Record<string,string>={scheduled:"Programado",completed:"Completado",cancelled:"Cancelado"};
const attendeeStatuses:Record<string,string>={confirmed:"Confirmado",declined:"Rechazado",pending:"Pendiente"};
export default function DashboardEventDetails({event,onClose}:{event:UpcomingEvent;onClose:()=>void}){
  if(event.kind==="Actividad"){
    const activity=event.record;
    const areas=[activity.spiritual&&"Espiritual",activity.social&&"Social",activity.physical&&"Físico",activity.intellectual&&"Intelectual"].filter(Boolean).join(", ");
    return <RecordDetails title={activity.activity_name} onClose={onClose} fields={[
      ["Fecha y hora",formatDateTimeLong(activity.activity_datetime)],
      ["Encargado",activity.assigned_to_name||"Sin asignar"],
      ["Propósito",activity.purpose||"Sin especificar"],["Descripción",activity.description||"Sin descripción"],
      ["Asistencia",activity.attendance!=null?`${activity.attendance} hermanos`:"Sin registrar"],
      ["Presupuesto",activity.budget!=null?new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(Number(activity.budget)):"Sin especificar"],
      ["Asignaciones",activity.assignments||"Sin asignaciones"],["Áreas",areas||"Sin especificar"],
    ]}/>;
  }
  const meeting=event.record;
  return <RecordDetails title={meeting.title} onClose={onClose} fields={[
    ["Fecha",formatDate(meeting.meeting_date)],
    ["Horario",`${meeting.start_time?.slice(0,5)||"—"} – ${meeting.end_time?.slice(0,5)||"—"}`],
    ["Creada por",meeting.created_by_name||"Sin asignar"],
    ["Estado",<span className={`status-badge status-${meeting.status||"scheduled"}`}>{meetingStatuses[meeting.status||"scheduled"]||meeting.status}</span>],
    ["Temas tratados",meeting.topics||"Sin temas registrados"],["Observaciones",meeting.notes?.trim()||"Sin observaciones."],
    ["Participantes",meeting.attendees?.length?<ul className="dashboard-event-attendees">{meeting.attendees.map(person=><li key={person.id}>{person.name} · {attendeeStatuses[person.status]||person.status}</li>)}</ul>:"No hay participantes registrados."],
  ]}/>;
}
