import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isTokenExpired } from "../components/RutaPrivada";
import { IoSyncOutline } from "react-icons/io5";
import {
  getOfflineState, listPendingChanges, subscribeOfflineState, synchronizePendingChanges,
  type OfflineState, type PendingMutation,
} from "../services/offlineSync";

const actions: Record<string, string> = { POST: "Crear", PUT: "Editar", PATCH: "Actualizar", DELETE: "Eliminar" };
const collections: Record<string, string> = {
  users: "miembro", students: "estudiante", teachers: "docente",
  attendance: "asistencia", grades: "calificación", enrollments: "matrícula",
  courses: "curso", topics: "tema", activities: "actividad", meetings: "consejo",
  speakers: "discursante", temas: "tema de discursante", temples: "templo",
  "temple-trips": "viaje", "trip-reservations": "reserva", "temple-amortizations": "pago",
};

function describe(change: PendingMutation) {
  const [resource, id] = change.url.split("?")[0].split("/").filter(Boolean);
  const reference = id && /^[1-9]\d*$/.test(id) ? ` #${id}` : "";
  return `${actions[change.method] ?? "Actualizar"} ${collections[resource] ?? "registro"}${reference}`;
}

export default function Sincronizacion() {
  const [state, setState] = useState<OfflineState | null>(null);
  const [changes, setChanges] = useState<PendingMutation[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function refresh() {
      const request = ++generation;
      try {
        const [nextState, pending] = await Promise.all([getOfflineState(), listPendingChanges()]);
        if (!active || request !== generation) return;
        setState(nextState);
        setChanges(pending);
        setError("");
      } catch {
        if (active && request === generation) setError("No se pudieron leer los cambios guardados.");
      }
    }
    const unsubscribe = subscribeOfflineState(() => { void refresh(); });
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    void refresh();
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  async function sync() {
    setRequesting(true);
    try {
      await synchronizePendingChanges(true);
    } catch {
      setError("No se pudo iniciar la sincronización. Inténtalo de nuevo.");
    } finally {
      setRequesting(false);
    }
  }

  const syncing = requesting || state?.syncing;
  const needsLogin = isTokenExpired(localStorage.getItem("token") ?? "");
  return (
    <section className="dashboard-container">
      <h1>Sincronización</h1>
      <p>Envía los cambios guardados en este dispositivo y actualiza las copias locales.</p>
      <button type="button" className="btn primary" disabled={!state?.online || syncing || needsLogin} onClick={sync}>
        <IoSyncOutline aria-hidden="true" /> {syncing ? "Sincronizando…" : "Sincronizar"}
      </button>
      {state && !state.online && <p role="status">Sin conexión. Los cambios se conservan en este dispositivo.</p>}
      {state?.message && <p role="status">{state.message}</p>}
      {state?.online && needsLogin && <p>Para sincronizar, <Link to="/iniciar-sesion">vuelve a iniciar sesión</Link>.</p>}
      {error && <p role="alert">{error}</p>}
      <h2>Cambios pendientes{state ? ` (${changes.length})` : ""}</h2>
      {!state && !error && <p role="status">Cargando cambios…</p>}
      {state && !changes.length && <p>No hay cambios pendientes.</p>}
      {changes.length > 0 && (
        <ul>
          {changes.map(change => (
            <li key={change.id}>
              <strong>{describe(change)}</strong>
              {" · "}
              <time dateTime={new Date(change.createdAt).toISOString()}>
                {new Date(change.createdAt).toLocaleString("es-AR")}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
