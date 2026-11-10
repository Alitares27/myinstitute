import api from "../api";
import {invalidarCache} from "../utils/clienteCache";
import {limpiarSesion} from "../utils/sesion";
import {useEffect,useRef,useState} from "react";
import {Link,NavLink,useLocation,useNavigate} from "react-router-dom";
import {useTheme} from "../context/ContextoTema";
import appMetadata from "../../package.json";
import "../styles/BarraLateral.css";
import type { IconType } from "react-icons";
import {IoHomeOutline,IoSchoolOutline,IoPersonOutline,IoClipboardOutline,IoCalendarOutline,IoRibbonOutline,IoBriefcaseOutline,IoMicOutline,IoPeopleOutline,IoDocumentTextOutline,IoBusinessOutline,IoSettingsOutline,IoLogOutOutline,IoMoonOutline,IoSunnyOutline,IoCashOutline,IoChevronUp,IoEllipsisHorizontalOutline,IoInformationCircleOutline,IoSyncOutline} from "react-icons/io5";

type NavItem = {to?:string;label:string;Icon:IconType;state?:Record<string,boolean>;action?:"about"};
type NavGroup = {id:string;label:string;Icon:IconType;links:NavItem[]};

const descriptions: Record<string, string> = {
 "/agendas": "Programación de bautismos",
 "/discursantes": "Asignaciones de discursos",
 "/consejos": "Reuniones y participantes",
 "/actividades": "Planificación de actividades",
 "/auditorias": "Historial de movimientos",
 "/maestros": "Docentes y cursos asignados",
 "/inscripciones": "Matrículas y seguimiento",
 "/asistencia": "Registros de asistencia",
 "/calificaciones": "Notas y reportes",
 "/miembros": "Datos y perfiles",
 "/viajes-templo": "Calendario de viajes",
 "/reservar-viajes": "Inscripción a viajes",
 "/pagos": "Pagos de viajes",
 "/templos": "Directorio de templos",
 "/sincronizacion": "Cambios pendientes de enviar",
};

function SubmenuLabel({ item }: { item: NavItem }) {
 const description = item.action === "about" ? "Información de la aplicación"
  : item.state?.openCourseManager ? "Catálogo y temas de los cursos"
  : item.state?.openTopicManager ? "Catálogo de temas para discursos"
  : descriptions[item.to ?? ""];
 return <>
  <item.Icon aria-hidden="true" />
  <span className="floating-nav-submenu-copy">
   <span>{item.label}</span>
   <small>{description}</small>
  </span>
 </>;
}

export default function Sidebar(){
 const navigate=useNavigate(),location=useLocation();
 const role=JSON.parse(localStorage.getItem("user")||"{}").role||"";
 const {theme,toggleTheme}=useTheme();
 const [open,setOpen]=useState<string|null>(null),[loggingOut,setLoggingOut]=useState(false);
 const [showAbout,setShowAbout]=useState(false);
 const [isMobile,setIsMobile]=useState(()=>window.matchMedia('(max-width: 700px)').matches);
 const nav=useRef<HTMLElement>(null);
 const triggers=useRef<Record<string,HTMLButtonElement|null>>({});
 const templeGroup:NavGroup={id:'temple',label:'Templo',Icon:IoBusinessOutline,links:[{to:'/viajes-templo',label:'Viajes',Icon:IoCalendarOutline},{to:'/reservar-viajes',label:'Reservas',Icon:IoPeopleOutline},{to:'/pagos',label:'Pagos',Icon:IoCashOutline}]};
 const groups:NavGroup[]=[
  {id:'teaching',label:'Enseñanza',Icon:IoSchoolOutline,links:[
   ...(role!=='admin'?[{to:'/miembros',label:role==='student'?'Mi perfil':'Miembros',Icon:IoPersonOutline}]:[]),
   {to:'/maestros',label:'Maestros',Icon:IoSchoolOutline},{to:'/inscripciones',label:'Matrículas',Icon:IoClipboardOutline},{to:'/asistencia',label:'Asistencia',Icon:IoCalendarOutline},{to:'/calificaciones',label:'Calificaciones',Icon:IoRibbonOutline}]},
  {id:'leadership',label:'Liderazgo',Icon:IoBriefcaseOutline,links:[{to:'/agendas',label:'Agendas',Icon:IoCalendarOutline},{to:'/discursantes',label:'Discursantes',Icon:IoMicOutline},{to:'/consejos',label:'Consejos',Icon:IoPeopleOutline},{to:'/actividades',label:'Actividades',Icon:IoCalendarOutline},{to:'/auditorias',label:'Auditorías',Icon:IoDocumentTextOutline}]},
  templeGroup,
  ...(role==='admin'?[{id:'maintenance',label:'Mantenimiento',Icon:IoSettingsOutline,links:[{to:'/miembros',label:'Miembros',Icon:IoPersonOutline},{to:'/templos',label:'Templos',Icon:IoBusinessOutline}]}]:[])
 ];
 const mobileGroups:NavGroup[]=[
  {id:'teaching',label:'Enseñanza',Icon:IoSchoolOutline,links:[
   {to:'/asistencia',label:'Asistencia',Icon:IoCalendarOutline},{to:'/calificaciones',label:'Calificaciones',Icon:IoRibbonOutline},
   {to:'/maestros',label:'Maestros y cursos',Icon:IoSchoolOutline},
  ]},
  {id:'leadership',label:'Liderazgo',Icon:IoBriefcaseOutline,links:[{to:'/agendas',label:'Agendas',Icon:IoCalendarOutline},{to:'/discursantes',label:'Discursantes',Icon:IoMicOutline},{to:'/consejos',label:'Consejos',Icon:IoPeopleOutline},{to:'/actividades',label:'Actividades',Icon:IoCalendarOutline},{to:'/auditorias',label:'Auditorías',Icon:IoDocumentTextOutline}]},
  templeGroup,
  {id:'more',label:'Más',Icon:IoEllipsisHorizontalOutline,links:[
   ...(role!=='admin'?[{to:'/miembros',label:role==='student'?'Mi perfil':'Miembros',Icon:IoPersonOutline}]:[]),

   {to:'/inscripciones',label:role==='admin'?'Administrar cursos':'Matrículas',Icon:IoClipboardOutline,...(role==='admin'?{state:{openCourseManager:true}}:{})},
   ...(role==='admin'?[{to:'/discursantes',label:'Temas para Discursantes',Icon:IoMicOutline,state:{openTopicManager:true}}]:[]),
   ...(role==='admin'?[{to:'/templos',label:'Administrar templos',Icon:IoBusinessOutline},{to:'/miembros',label:'Miembros',Icon:IoPersonOutline}]:[]),
   {to:'/sincronizacion',label:'Sincronización',Icon:IoSyncOutline},
   {label:'Acerca de',Icon:IoInformationCircleOutline,action:'about'}
  ]}
 ];
 useEffect(()=>{
  const query=window.matchMedia('(max-width: 700px)');
  const update=(event:MediaQueryListEvent)=>setIsMobile(event.matches);
  setIsMobile(query.matches);
  query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 useEffect(()=>{setOpen(null);},[location.pathname]);
 useEffect(()=>{
  if(!open)return;
  function outside(event:PointerEvent){if(!nav.current?.contains(event.target as Node))setOpen(null);}
  function escape(event:KeyboardEvent){if(event.key==='Escape'){setOpen(null);triggers.current[open!]?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 async function logout(){
  setLoggingOut(true);
  try{await api.post('/logout');}
  catch{window.alert('Se cerrará la sesión local, pero no se pudo confirmar la revocación en el servidor. Si perdiste tu dispositivo, cambia la contraseña al recuperar conexión.');}
  invalidarCache();await limpiarSesion();navigate('/');
 }
 const visibleGroups = isMobile ? mobileGroups : groups;
 const openGroup = visibleGroups.find(group => group.id === open);
 const token=localStorage.getItem("token");
 const hasActiveSession=!!token&&!!localStorage.getItem("user");
 if(!hasActiveSession)return null;
 return <>
  <header className="app-topbar">
   <Link to="/panel" className="app-brand" aria-label="GestionAR, ir al inicio"><img src="/temple.webp" alt="" width="65" height="65"/><span>GestionAR</span></Link>
   <div className="app-topbar-actions">
    <button type="button" className="app-icon-button" onClick={toggleTheme} title={theme==='light'?'Activar tema oscuro':'Activar tema claro'} aria-label={theme==='light'?'Activar tema oscuro':'Activar tema claro'}>{theme==='light'?<IoMoonOutline aria-hidden="true"/>:<IoSunnyOutline aria-hidden="true"/>}</button>
    <button type="button" className="app-icon-button app-logout" onClick={logout} disabled={loggingOut} aria-label="Cerrar sesión" title="Cerrar sesión"><IoLogOutOutline aria-hidden="true"/></button>
   </div>
  </header>
  {openGroup && <button type="button" className="floating-nav-backdrop" aria-label={`Cerrar el menú ${openGroup.label}`} onClick={() => setOpen(null)} />}
  <nav ref={nav} className="floating-nav" aria-label="Menú principal" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(null);}}>
   <ul className="floating-nav-groups">
    <li className="floating-nav-home-item">
     <NavLink to="/panel" end className="floating-nav-home" aria-label="Inicio" title="Inicio" onClick={()=>setOpen(null)}>
      <IoHomeOutline aria-hidden="true"/><span className="floating-nav-label">Inicio</span>
     </NavLink>
    </li>
    {visibleGroups.map(group=>{
    const active=group.links.some(link=>location.pathname===link.to||location.pathname.startsWith(link.to+'/'));
    return <li key={group.id} className={group.id==='more'?'floating-nav-more-item':undefined}>
     <button ref={element=>{triggers.current[group.id]=element;}} type="button" className={`floating-nav-trigger ${active?'is-active':''} ${open===group.id?'is-open':''}`} aria-label={group.label} title={group.label} aria-expanded={open===group.id} aria-controls={`nav-${group.id}`} onClick={()=>setOpen(previous=>previous===group.id?null:group.id)}>
      <group.Icon aria-hidden="true"/><span className="floating-nav-label">{group.label}</span><IoChevronUp className="floating-nav-chevron" aria-hidden="true"/>
     </button>
     {open === group.id && <ul className="floating-nav-submenu" id={`nav-${group.id}`} aria-label={group.label}>
      {group.links.map(link => (
       <li key={link.label}>
        {link.action === "about" ? (
         <button type="button" aria-label={link.label} onClick={() => { setOpen(null); setShowAbout(true); }}>
          <SubmenuLabel item={link} />
         </button>
        ) : (
         <NavLink to={link.to!} state={link.state} aria-label={link.label} onClick={() => setOpen(null)}>
          <SubmenuLabel item={link} />
         </NavLink>
        )}
       </li>
      ))}
     </ul>}
    </li>;
   })}</ul>
  </nav>
  {showAbout&&<div className="ios-dialog-backdrop" onClick={event=>{if(event.target===event.currentTarget)setShowAbout(false);}}>
   <section className="ios-dialog about-app-dialog" role="dialog" aria-modal="true" aria-labelledby="about-app-title">
    <IoInformationCircleOutline className="about-app-icon" aria-hidden="true"/>
    <h2 id="about-app-title">Acerca de GestionAR</h2>
    <p>GestionAR ayuda a organizar cursos, miembros, asistencia, calificaciones y actividades del instituto en un solo lugar.</p>
    <dl className="about-app-details">
     <div><dt>Versión</dt><dd>{appMetadata.version}</dd></div>
     <div><dt>Desarrollador</dt><dd>PayLab</dd></div>
    </dl>
    <p className="about-app-copyright">© {new Date().getFullYear()} GestionAR. Todos los derechos reservados.</p>
   </section>
  </div>}
 </>;
}
