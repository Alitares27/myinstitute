import { useEffect } from "react";
import { useLocation,useNavigate } from "react-router-dom";
import { AppearanceOptions } from "../components/AppearanceSettings";
import Sincronizacion from "./Sincronizacion";
import Notificaciones from "./Notificaciones";
import { canAccessModule,readSessionUser,firstAllowedPage } from "../utils/access";
import appMetadata from "../../package.json";
import AndroidNotificationSettings from "../components/AndroidNotificationSettings";
import "../styles/Ajustes.css";

export default function Ajustes(){
  const user=readSessionUser();
  const navigate=useNavigate();
  const {hash}=useLocation();
  useEffect(()=>{const id=hash.slice(1);if(['sincronizacion','notificaciones','apariencia','acerca-de'].includes(id))document.getElementById(id)?.scrollIntoView?.({block:'start'});},[hash]);
  return <div className="settings-page">
    <h1>Ajustes</h1>
    <p className="text-muted">Gestiona la sincronización, los recordatorios y la apariencia de la aplicación.</p>
    <nav className="settings-sections" aria-label="Secciones de ajustes"><a href="#sincronizacion">Sincronización</a><a href="#notificaciones">Notificaciones</a><a href="#apariencia">Apariencia</a><a href="#acerca-de">Acerca de</a></nav>
    <section id="sincronizacion" className="settings-section" aria-label="Sincronización">
      {canAccessModule(user,'sincronizacion')?<Sincronizacion embedded/>:<><h2>Sincronización</h2><p>Tu cuenta no tiene habilitada esta sección. Puedes solicitar el acceso a un administrador.</p></>}
    </section>
    <section id="notificaciones" className="settings-section" aria-label="Notificaciones">
      <AndroidNotificationSettings/>
      {user?.role==='admin'?<Notificaciones embedded/>:<><h2>Notificaciones</h2><p>Consulta tus avisos desde la campana del encabezado. Un administrador configura los días y horarios de los recordatorios.</p></>}
    </section>
    <section id="apariencia" className="settings-section" aria-labelledby="settings-appearance-title"><h2 id="settings-appearance-title">Apariencia</h2><AppearanceOptions onClose={()=>navigate(firstAllowedPage(user))}/></section>
    <section id="acerca-de" className="settings-section" aria-labelledby="settings-about-title"><h2 id="settings-about-title">Acerca de GestionAR</h2><p>GestionAR ayuda a organizar cursos, miembros, asistencia, calificaciones y actividades del instituto en un solo lugar.</p><dl className="record-details"><div><dt>Versión</dt><dd>{appMetadata.version}</dd></div><div><dt>Desarrollador</dt><dd>PayLab</dd></div></dl><p className="text-muted">© {new Date().getFullYear()} GestionAR. Todos los derechos reservados.</p></section>
  </div>;
}
