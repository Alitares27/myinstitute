import { useEffect, useState } from "react";
import { getOfflineState, subscribeOfflineState, type OfflineState } from "../services/offlineSync";

const initialState: OfflineState = { online: navigator.onLine, pending: 0, syncing: false, message: "" };

export default function EstadoSincronizacion() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let active = true;
    const refresh = () => { void getOfflineState().then((next) => { if (active) setState(next); }); };
    const unsubscribe = subscribeOfflineState((next) => setState(next));
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  if (state.online && state.pending === 0 && !state.message) return null;

  const text = state.message || (state.syncing
    ? "Sincronizando cambios guardados…"
    : state.online
      ? `${state.pending} cambio${state.pending === 1 ? "" : "s"} pendiente${state.pending === 1 ? "" : "s"} de sincronización.`
      : `Sin conexión. ${state.pending ? `${state.pending} cambio${state.pending === 1 ? "" : "s"} guardado${state.pending === 1 ? "" : "s"} en este dispositivo.` : "Se mostrarán los datos guardados en este dispositivo."}`);

  return <div className="offline-banner" role="status" aria-live="polite">{text}</div>;
}
