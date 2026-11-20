import { useCallback, useEffect, useState } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { Link } from "react-router-dom";
import api from "../api";
import FormModal from "./FormModal";
import { formatDateTime } from "../utils/utilidadesFecha";
import "../styles/Notifications.css";

type Notice = { id:string; title:string; message:string; href:string; date:string; read:boolean };
export default function NotificationBell() {
  const [items,setItems]=useState<Notice[]>([]);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    try {
      const {data}=await api.get<Notice[]>("/notifications",{signal});
      if (!signal?.aborted) {setItems(Array.isArray(data)?data:[]);setError("");}
    } catch {if (!signal?.aborted) setError(window.navigator.onLine?"No se pudieron cargar las notificaciones.":"Conéctate para actualizar las notificaciones.");}
    finally {if (!signal?.aborted) setLoading(false);}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    const update=()=>{if(document.visibilityState!=="hidden") void refresh(controller.signal);};
    update();
    const timer=window.setInterval(update,60000);
    window.addEventListener("online",update);
    document.addEventListener("visibilitychange",update);
    window.addEventListener("notifications:settings",update);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener("online",update);document.removeEventListener("visibilitychange",update);window.removeEventListener("notifications:settings",update);};
  },[refresh]);
  const unread=items.filter(item=>!item.read).length;
  async function markRead(ids:string[]) {
    if (!ids.length) return;
    try {await api.post("/notifications/read",{ids});setItems(previous=>previous.map(item=>ids.includes(item.id)?{...item,read:true}:item));}
    catch {setError("No se pudieron marcar los avisos como leídos.");}
  }
  return <>
    <button type="button" className="app-icon-button notification-bell" title="Notificaciones" aria-label={unread?`Notificaciones: ${unread} sin leer`:"Notificaciones"} onClick={()=>{setOpen(true);void refresh();}}>
      <IoNotificationsOutline aria-hidden="true"/>
      {unread>0&&<span className="notification-count" aria-hidden="true">{unread>99?"99+":unread}</span>}
    </button>
    {open&&<FormModal title="Notificaciones" onClose={()=>setOpen(false)}>
      {error&&<p role="alert">{error}</p>}
      {loading&&<p role="status">Cargando notificaciones…</p>}
      {!loading&&!error&&!items.length&&<p>No tienes recordatorios pendientes.</p>}
      {unread>0&&<button type="button" className="btn secondary" onClick={()=>void markRead(items.filter(item=>!item.read).map(item=>item.id))}>Marcar leídas</button>}
      <ul className="notification-list">{items.map(item=><li key={item.id} className={item.read?"is-read":"is-unread"}>
        <Link to={item.href} onClick={()=>{void markRead([item.id]);setOpen(false);}}><strong>{item.title}{!item.read&&<small>Sin leer</small>}</strong><span>{item.message}</span><time>{formatDateTime(item.date)}</time></Link>
      </li>)}</ul>
      <p className="notification-help">Los recordatorios se actualizan al abrir la aplicación y mientras está en uso.</p>
    </FormModal>}
  </>;
}
