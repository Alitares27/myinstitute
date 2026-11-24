import { useEffect,useState } from "react";
import { androidNotificationPermission,enableAndroidNotifications,isAndroidNotifications } from "../native/androidNotifications";
export default function AndroidNotificationSettings(){
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(isAndroidNotifications())void androidNotificationPermission().then(setStatus).catch(()=>setStatus('error'));},[]);
  if(!isAndroidNotifications())return null;
  async function enable(){setBusy(true);try{const granted=await enableAndroidNotifications();setStatus(granted?'granted':'denied');}catch{setStatus('error');}finally{setBusy(false);}}
  return <div className="android-notification-settings"><h3>Avisos de Android</h3><p>Programa los recordatorios en este dispositivo para recibirlos aunque cierres la aplicación.</p><button type="button" className="btn secondary" disabled={busy} onClick={()=>void enable()}>{busy?'Activando…':status==='granted'?'Actualizar avisos de Android':'Activar avisos de Android'}</button>{status==='granted'&&<p role="status">Permiso concedido. Los recordatorios se actualizan al abrir la app con conexión.</p>}{status==='denied'&&<p role="status">Habilita las notificaciones de GestionAR en los ajustes de Android.</p>}{status==='error'&&<p role="alert">No se pudo activar el permiso. Revisa los ajustes de Android.</p>}<p className="text-muted">Android puede retrasar avisos por ahorro de batería. Los cambios realizados con la app cerrada se actualizan al volver a abrirla con conexión.</p></div>;
}
