import { useCallback, useEffect, useRef, useState } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { Link,useNavigate } from "react-router-dom";
import api from "../api";
import FormModal from "./FormModal";
import { formatDateTime } from "../utils/utilidadesFecha";
import "../styles/Notifications.css";
import { isAndroidNotifications,listenAndroidNotifications,synchronizeAndroidReminders } from "../native/androidNotifications";
import type { ReminderPlan } from "../native/androidNotifications";
import AndroidNotificationSettings from "./AndroidNotificationSettings";

type Notice = { id:string; title:string; message:string; href:string; date:string; read:boolean };
export default function NotificationBell() {
  const navigate=useNavigate();
  const lastNativeSync=useRef(0);
  const [nativeError,setNativeError]=useState("");
  const [items,setItems]=useState<Notice[]>([]);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    try {
      const {data}=await api.get<Notice[]>("/notifications",{signal});
      if (!signal?.aborted) {setItems(Array.isArray(data)?data:[]);setError("");}
      if(!signal?.aborted&&isAndroidNotifications()&&localStorage.getItem('android-reminders-enabled')==='true'&&Date.now()-lastNativeSync.current>900000){
        try{
          const userId=String(JSON.parse(localStorage.getItem('user')||'{}')?.id??'');
          const plan=await api.get<ReminderPlan[]>('/notifications/plan',{signal});
          if(!signal?.aborted&&userId){await synchronizeAndroidReminders(userId,plan.data);lastNativeSync.current=Date.now();setNativeError('');}
        }catch{if(!signal?.aborted)setNativeError('No se pudieron actualizar los recordatorios de Android. Vuelve a conectar la aplicación.');}
      }
    } catch {if (!signal?.aborted) setError(window.navigator.onLine?"No se pudieron cargar las notificaciones.":"Conéctate para actualizar las notificaciones.");}
    finally {if (!signal?.aborted) setLoading(false);}
  },[]);
  useEffect(()=>{let active=true;let listener:{remove:()=>Promise<void>}|undefined;void listenAndroidNotifications(href=>navigate(href)).then(handle=>{if(active)listener=handle;else void handle.remove();}).catch(()=>{});return()=>{active=false;void listener?.remove();};},[navigate]);
  useEffect(()=>{
    const controller=new AbortController();
    const update=()=>{if(document.visibilityState!=="hidden") void refresh(controller.signal);};
    const forceUpdate=()=>{lastNativeSync.current=0;update();};
    update();
    const timer=window.setInterval(update,60000);
    window.addEventListener("online",update);
    document.addEventListener("visibilitychange",forceUpdate);
    window.addEventListener("notifications:settings",forceUpdate);
    window.addEventListener("notifications:native-enable",forceUpdate);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener("online",update);document.removeEventListener("visibilitychange",forceUpdate);window.removeEventListener("notifications:settings",forceUpdate);window.removeEventListener("notifications:native-enable",forceUpdate);};
  },[refresh]);
  const unread=items.filter(item=>!item.read).length;
  async function markRead(ids:string[]) {
    if (!ids.length) return;
    try {await api.post("/notifications/read",{ids});setItems(previous=>previous.map(item=>ids.includes(item.id)?{...item,read:true}:item));if(isAndroidNotifications()){lastNativeSync.current=0;void refresh();}}
    catch {setError("No se pudieron marcar los avisos como leídos.");}
  }
  return <>
    <button type="button" className="app-icon-button notification-bell" title="Notificaciones" aria-label={unread?`Notificaciones: ${unread} sin leer`:"Notificaciones"} onClick={()=>{setOpen(true);void refresh();}}>
      <IoNotificationsOutline aria-hidden="true"/>
      {unread>0&&<span className="notification-count" aria-hidden="true">{unread>99?"99+":unread}</span>}
    </button>
    {open&&<FormModal title="Notificaciones" onClose={()=>setOpen(false)}>
      <AndroidNotificationSettings/>
      {nativeError&&<p role="alert">{nativeError}</p>}
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
