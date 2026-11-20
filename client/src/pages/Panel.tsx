import { canAccessModule, moduleForPath, readSessionUser } from "../utils/access";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/Panel.css";
import { IoCalendarOutline, IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { TbBooks, TbCalendar, TbBook, TbStar, TbBuilding, TbSettings, TbPencil, TbChartBar, TbRocket } from "react-icons/tb";
import type { Activity } from "../interfaces/Activity";
import type { Meeting } from "../interfaces/Meeting";
import { localDateKey, upcomingEvents, upcomingWindow } from "../utils/upcomingEvents";
import type { UpcomingEvent } from "../utils/upcomingEvents";
import { formatDate } from "../utils/utilidadesFecha";
import { MEMBER_ROLES } from "../interfaces/User";
import DashboardEventDetails from "../components/DashboardEventDetails";

function Dashboard() {
  const [user] = useState(readSessionUser);
  const canViewActivities=canAccessModule(user,"actividades");
  const canViewMeetings=canAccessModule(user,"consejos");
  const [day,setDay]=useState(()=>localDateKey(new Date()));
  const [events,setEvents]=useState<UpcomingEvent[]>([]);
  const [selectedEvent,setSelectedEvent]=useState<UpcomingEvent|null>(null);
  const [desktop,setDesktop]=useState(()=>!document.documentElement.classList.contains("native-android")&&window.matchMedia("(min-width: 701px)").matches);
  useEffect(()=>{const query=window.matchMedia("(min-width: 701px)");const update=()=>setDesktop(!document.documentElement.classList.contains("native-android")&&query.matches);query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(canViewActivities||canViewMeetings);
  const carousel=useRef<HTMLDivElement>(null);
  const range=upcomingWindow(new Date(`${day}T12:00:00`));
  useEffect(()=>{const update=()=>setDay(localDateKey(new Date()));const timer=window.setInterval(update,60000);document.addEventListener("visibilitychange",update);return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",update);};},[]);
  useEffect(()=>{
    if(!canViewActivities&&!canViewMeetings){setEvents([]);setLoading(false);return;}
    const controller=new AbortController();setLoading(true);setError("");
    void Promise.allSettled([
      canViewActivities?api.get<Activity[]>("/activities",{signal:controller.signal}):Promise.resolve({data:[]}),
      canViewMeetings?api.get<Meeting[]>("/meetings",{signal:controller.signal}):Promise.resolve({data:[]}),
    ]).then(([activities,meetings])=>{
      if(controller.signal.aborted)return;
      const activityRows=activities.status==="fulfilled"&&Array.isArray(activities.value.data)?activities.value.data:[];
      const meetingRows=meetings.status==="fulfilled"&&Array.isArray(meetings.value.data)?meetings.value.data:[];
      setEvents(upcomingEvents(activityRows,meetingRows,range));
      if(activities.status==="rejected"||meetings.status==="rejected")setError("No se pudieron cargar todos los eventos. Se muestran los disponibles.");
      setLoading(false);
    });
    return()=>controller.abort();
  },[day,canViewActivities,canViewMeetings]);
  function move(direction:number){const node=carousel.current;if(node)node.scrollBy({left:direction*node.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?"auto":"smooth"});}

  const shortcuts = user?.role === "finance" ? [
    {to:"/miembros",title:"Miembros",description:"Gestionar miembros",Icon:TbSettings},
    {to:"/reservar-viajes",title:"Reservas",description:"Reservas de viajes",Icon:TbBuilding},
    {to:"/pagos",title:"Pagos",description:"Registrar pagos",Icon:TbBook},
  ] : user?.role === "admin" ? [
    { to: "/consejos", title: "Consejos", description: "Gestionar consejos", Icon: TbCalendar },
    { to: "/reservar-viajes", title: "Templo", description: "Reservas y viajes", Icon: TbBuilding },
    { to: "/miembros", title: "Miembros", description: "Directorio de miembros", Icon: TbSettings },
  ] : user?.role === "teacher" ? [
    { to: "/asistencia", title: "Asistencia", description: "Registrar asistencia", Icon: TbPencil },
    { to: "/calificaciones", title: "Calificaciones", description: "Registrar notas", Icon: TbChartBar },
    { to: "/inscripciones", title: "Mis cursos", description: "Ver mis cursos", Icon: TbBooks },
  ] : [
    { to: "/inscripciones", title: "Mis cursos", description: "Ver mis clases", Icon: TbBook },
    { to: "/calificaciones", title: "Mis notas", description: "Consultar calificaciones", Icon: TbStar },
    { to: "/asistencia", title: "Mi asistencia", description: "Ver mi asistencia", Icon: TbCalendar },
  ];
  shortcuts.push({ to: "/actividades", title: "Actividades", description: "Ver actividades", Icon: TbCalendar });

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <span className="role-badge">{user?MEMBER_ROLES[user.role]:""}</span>
        <h1 className="dashboard-title">Hola, {user?.name}</h1>
        <p className="dashboard-subtitle">
          Bienvenido de nuevo. Aquí tienes un resumen de lo que está sucediendo en tu cuenta hoy.
        </p>
      </div>
      <section className="monthly-activities" aria-label="Actividades y consejos de los próximos tres meses">
        <header className="monthly-activities-header"><h2>Próximos 3 meses</h2>
          <div><button type="button" className="btn secondary btn-icon" aria-label="Evento anterior" disabled={events.length<2} onClick={()=>move(-1)}><IoChevronBackOutline aria-hidden="true"/></button><button type="button" className="btn secondary btn-icon" aria-label="Evento siguiente" disabled={events.length<2} onClick={()=>move(1)}><IoChevronForwardOutline aria-hidden="true"/></button></div>
        </header>
        <p className="text-muted">Actividades y consejos del {formatDate(range.start)} al {formatDate(range.end)}.</p>
        {loading&&<p role="status">Cargando eventos…</p>}
        {error&&<p role="alert">{error}</p>}
        {!canViewActivities&&!canViewMeetings&&<p>Tu cuenta no tiene acceso a actividades ni consejos.</p>}
        {(canViewActivities||canViewMeetings)&&!loading&&!error&&!events.length&&<p>No hay eventos registrados para los próximos tres meses.</p>}
        <div className="activity-carousel" ref={carousel} tabIndex={0} role="region" aria-label="Carrusel de actividades y consejos" aria-roledescription="carrusel">
          {events.map(event=><article key={event.id} className="monthly-activity-card"
            role={desktop?"button":undefined} tabIndex={desktop?0:undefined} aria-haspopup={desktop?"dialog":undefined} aria-label={desktop?`Ver detalles de ${event.title}`:undefined}
            onClick={desktop?()=>setSelectedEvent(event):undefined}
            onKeyDown={desktop?e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedEvent(event);}}:undefined}>
            <IoCalendarOutline className="monthly-activity-icon" aria-hidden="true"/>
            <span className="upcoming-event-kind">{event.kind}</span>
            <h3>{event.title}</h3>
            <dl><div><dt>Día</dt><dd>{formatDate(event.datetime,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</dd></div><div><dt>Hora</dt><dd>{event.datetime.split("T")[1]?.slice(0,5)||"Sin hora"}</dd></div><div><dt>Responsable</dt><dd>{event.responsible}</dd></div>{event.kind==="Consejo"&&event.status&&<div><dt>Estado</dt><dd>{({scheduled:"Programado",pending:"Pendiente",completed:"Completado",cancelled:"Cancelado"} as Record<string,string>)[event.status]||event.status}</dd></div>}</dl>
          </article>)}
        </div>
      </section>

      <div className="shortcuts-section">
        <h2 className="section-title">
          <span><TbRocket /></span> Accesos Rápidos
        </h2>
        <div className="shortcuts-grid">
          {shortcuts.filter(({ to }) => {
            const module = moduleForPath(to);
            return module && canAccessModule(user, module);
          }).map(({ to, title, description, Icon }) => (
            <Link className="shortcut-card" key={to} to={to}>
              <span className="shortcut-icon-bg"><Icon aria-hidden="true" /></span>
              <div className="shortcut-info">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {selectedEvent&&<DashboardEventDetails event={selectedEvent} onClose={()=>setSelectedEvent(null)}/>}
    </div>
  );
}

export default Dashboard;
