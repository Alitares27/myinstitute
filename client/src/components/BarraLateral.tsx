import api from "../api";
import {invalidarCache} from "../utils/clienteCache";
import {limpiarSesion} from "../utils/sesion";
import {useEffect,useRef,useState} from "react";
import {Link,NavLink,useLocation,useNavigate} from "react-router-dom";
import {useTheme} from "../context/ContextoTema";
import "../styles/BarraLateral.css";
import type { IconType } from "react-icons";
import {IoHomeOutline,IoSchoolOutline,IoPersonOutline,IoClipboardOutline,IoCalendarOutline,IoRibbonOutline,IoBriefcaseOutline,IoMicOutline,IoPeopleOutline,IoDocumentTextOutline,IoBusinessOutline,IoSettingsOutline,IoLogOutOutline,IoMoonOutline,IoSunnyOutline,IoCashOutline,IoChevronUp,IoEllipsisHorizontalOutline} from "react-icons/io5";

type NavItem = {to:string;label:string;Icon:IconType;state?:Record<string,boolean>};
type NavGroup = {id:string;label:string;Icon:IconType;links:NavItem[]};

export default function Sidebar(){
 const navigate=useNavigate(),location=useLocation();
 const role=JSON.parse(localStorage.getItem("user")||"{}").role||"";
 const {theme,toggleTheme}=useTheme();
 const [open,setOpen]=useState<string|null>(null),[loggingOut,setLoggingOut]=useState(false);
 const [isMobile,setIsMobile]=useState(()=>window.matchMedia('(max-width: 700px)').matches);
 const nav=useRef<HTMLElement>(null);
 const triggers=useRef<Record<string,HTMLButtonElement|null>>({});
 const groups:NavGroup[]=[
  {id:'teaching',label:'Enseñanza',Icon:IoSchoolOutline,links:[
   ...(role!=='admin'?[{to:'/miembros',label:role==='student'?'Mi perfil':'Miembros',Icon:IoPersonOutline}]:[]),
   {to:'/maestros',label:'Maestros',Icon:IoSchoolOutline},{to:'/inscripciones',label:'Matrículas',Icon:IoClipboardOutline},{to:'/asistencia',label:'Asistencia',Icon:IoCalendarOutline},{to:'/calificaciones',label:'Calificaciones',Icon:IoRibbonOutline}]},
  {id:'leadership',label:'Liderazgo',Icon:IoBriefcaseOutline,links:[{to:'/discursantes',label:'Discursantes',Icon:IoMicOutline},{to:'/consejos',label:'Consejos',Icon:IoPeopleOutline},{to:'/actividades',label:'Actividades',Icon:IoCalendarOutline},{to:'/auditorias',label:'Auditorías',Icon:IoDocumentTextOutline}]},
  {id:'temple',label:'Templo',Icon:IoBusinessOutline,links:[{to:'/viajes-templo',label:'Viajes',Icon:IoCalendarOutline},{to:'/reservar-viajes',label:'Reservas',Icon:IoPeopleOutline},{to:'/pagos',label:'Pagos',Icon:IoCashOutline}]},
  ...(role==='admin'?[{id:'maintenance',label:'Mantenimiento',Icon:IoSettingsOutline,links:[{to:'/miembros',label:'Miembros',Icon:IoPersonOutline},{to:'/templos',label:'Templos',Icon:IoBusinessOutline}]}]:[])
 ];
 const mobileGroups:NavGroup[]=[
  {id:'teaching',label:'Enseñanza',Icon:IoSchoolOutline,links:[
   ...(role!=='admin'?[{to:'/miembros',label:role==='student'?'Mi perfil':'Miembros',Icon:IoPersonOutline}]:[]),
   {to:'/asistencia',label:'Asistencia',Icon:IoCalendarOutline},{to:'/calificaciones',label:'Calificaciones',Icon:IoRibbonOutline}]},
  {id:'leadership',label:'Liderazgo',Icon:IoBriefcaseOutline,links:[{to:'/discursantes',label:'Discursantes',Icon:IoMicOutline},{to:'/consejos',label:'Consejos',Icon:IoPeopleOutline},{to:'/actividades',label:'Actividades',Icon:IoCalendarOutline},{to:'/auditorias',label:'Auditorías',Icon:IoDocumentTextOutline}]},
  {id:'more',label:'Más',Icon:IoEllipsisHorizontalOutline,links:[
   {to:'/maestros',label:'Maestros y cursos',Icon:IoSchoolOutline},
   {to:'/inscripciones',label:role==='admin'?'Administrar cursos':'Matrículas',Icon:IoClipboardOutline,...(role==='admin'?{state:{openCourseManager:true}}:{})},
   ...(role==='admin'?[{to:'/discursantes',label:'Temas para Discursantes',Icon:IoMicOutline,state:{openTopicManager:true}}]:[]),
   {to:'/viajes-templo',label:'Viajes al templo',Icon:IoCalendarOutline},{to:'/reservar-viajes',label:'Reservas del templo',Icon:IoPeopleOutline},{to:'/pagos',label:'Pagos del templo',Icon:IoCashOutline},
   ...(role==='admin'?[{to:'/templos',label:'Administrar templos',Icon:IoBusinessOutline},{to:'/miembros',label:'Miembros',Icon:IoPersonOutline}]:[])
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
 return <>
  <header className="app-topbar">
   <Link to="/panel" className="app-brand" aria-label="GestionAR, ir al inicio"><img src="/temple.webp" alt="" width="65" height="65"/><span>GestionAR</span></Link>
   <div className="app-topbar-actions">
    <button type="button" className="app-icon-button" onClick={toggleTheme} title={theme==='light'?'Activar tema oscuro':'Activar tema claro'} aria-label={theme==='light'?'Activar tema oscuro':'Activar tema claro'}>{theme==='light'?<IoMoonOutline aria-hidden="true"/>:<IoSunnyOutline aria-hidden="true"/>}</button>
    <button type="button" className="app-icon-button app-logout" onClick={logout} disabled={loggingOut} aria-label="Cerrar sesión" title="Cerrar sesión"><IoLogOutOutline aria-hidden="true"/></button>
   </div>
  </header>
  <nav ref={nav} className="floating-nav" aria-label="Menú principal" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(null);}}>
   <ul className="floating-nav-groups">
    <li className="floating-nav-home-item">
     <NavLink to="/panel" end className="floating-nav-home" aria-label="Inicio" title="Inicio" onClick={()=>setOpen(null)}>
      <IoHomeOutline aria-hidden="true"/><span className="floating-nav-label">Inicio</span>
     </NavLink>
    </li>
    {(isMobile?mobileGroups:groups).map(group=>{
    const active=group.links.some(link=>location.pathname===link.to||location.pathname.startsWith(link.to+'/'));
    return <li key={group.id} className={group.id==='more'?'floating-nav-more-item':undefined}>
     <button ref={element=>{triggers.current[group.id]=element;}} type="button" className={`floating-nav-trigger ${active?'is-active':''} ${open===group.id?'is-open':''}`} aria-label={group.label} title={group.label} aria-expanded={open===group.id} aria-controls={`nav-${group.id}`} onClick={()=>setOpen(previous=>previous===group.id?null:group.id)}>
      <group.Icon aria-hidden="true"/><span className="floating-nav-label">{group.label}</span><IoChevronUp className="floating-nav-chevron" aria-hidden="true"/>
     </button>
     {open===group.id&&<ul className="floating-nav-submenu" id={`nav-${group.id}`} aria-label={group.label}>{group.links.map(link=><li key={link.label}><NavLink to={link.to} state={link.state} aria-label={link.label} title={link.label} onClick={()=>setOpen(null)}><link.Icon aria-hidden="true"/><span className="floating-nav-label">{link.label}</span></NavLink></li>)}</ul>}
    </li>;
   })}</ul>
  </nav>
 </>;
}
