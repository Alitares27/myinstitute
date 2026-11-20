import { TABLE_PAGE_SIZE } from "../shared/constants";
import Pagination from "../components/Pagination";
import api from "../api";
import { IoCashOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { canAccessModule, readSessionUser } from "../utils/access";
import { useEffect, useState } from "react";
import { usePagedList } from "../hooks/usePagedList";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatDate, formatDateTime } from "../utils/utilidadesFecha";
import { RecordDetails, ViewRecordButton } from "../components/RecordDetails";

type SecurityEvent = {
  id: number;
  occurred_at: string;
  actor_id: number | null;
  target_id: number | null;
  action: string;
  outcome: string;
  module: string | null;
};

function SecurityHistory() {
  const [selected, setSelected] = useState<SecurityEvent | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const eventPage=useTablePagination(events);
  const [status, setStatus] = useState("Cargando eventos…");
  useEffect(() => {
    const controller = new AbortController();
    api.get<SecurityEvent[]>("/security-events", { signal: controller.signal }).then(({ data }) => {
      setEvents(data);
      setStatus(data.length ? "" : "No hay eventos de seguridad.");
    }).catch(() => {
      if (!controller.signal.aborted) setStatus("No se pudieron cargar los eventos de seguridad.");
    });
    return () => controller.abort();
  }, []);

  return (
    <section aria-label="Eventos de seguridad">
      {status && <p role="status">{status}</p>}
      {events.length > 0 && <div className="audit-table-scroll table-container">
        <table>
          <thead><tr><th className="table-desktop-only">Fecha</th><th>Acción</th><th className="table-desktop-only">Actor</th><th className="table-desktop-only">Cuenta</th><th className="table-desktop-only">Módulo</th><th className="table-mobile-only">Detalle</th><th scope="col">Acciones</th></tr></thead>
          <tbody>
            {eventPage.items.map(event => (
              <tr key={event.id}>
                <td className="table-desktop-only">{formatDateTime(event.occurred_at)}</td>
                <td>{event.outcome === "denied" ? `Acceso denegado (${event.action})`
                  : event.action === "account_created" ? "Cuenta creada" : "Acceso modificado"}</td>
                <td className="table-desktop-only">{event.actor_id ?? "—"}</td>
                <td className="table-desktop-only">{event.target_id ?? "—"}</td>
                <td className="table-desktop-only">{event.module ?? "—"}</td>
                <td className="table-mobile-only">{event.module ?? "Sin módulo"} · Cuenta {event.target_id ?? "—"}</td>
                <td><div className="table-record-actions"><ViewRecordButton label="Ver detalles del evento" onClick={() => setSelected(event)} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      <Pagination currentPage={eventPage.currentPage} totalPages={eventPage.totalPages} onChange={eventPage.setPage} />
      {selected && <RecordDetails title="Evento de seguridad" onClose={() => setSelected(null)} fields={[
        ["Fecha", formatDateTime(selected.occurred_at)], ["Acción", selected.action],
        ["Resultado", selected.outcome === "denied" ? "Acceso denegado" : selected.outcome],
        ["Actor", selected.actor_id], ["Cuenta", selected.target_id], ["Módulo", selected.module],
      ]} />}
    </section>
  );
}

const RECORDS_PER_PAGE = TABLE_PAGE_SIZE;

type DetailFields = Record<string, unknown>;
type FinancialEvent = {
  id: number;
  created_at: string;
  event_type: string;
  actor_id: number | null;
  actor_name: string | null;
  reservation_id: number | null;
  reservation_member_name: string | null;
  details: unknown;
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const paymentMethods = new Map([
  ["efectivo", "Efectivo"],
  ["transferencia", "Transferencia"],
  ["donacion", "Donación"],
]);

function asFields(value: unknown): DetailFields {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DetailFields : {};
}

function formatAmount(value: unknown) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? money.format(amount) : "—";
}

function EventDetails({ event }: { event: FinancialEvent }) {
  const details = asFields(event.details);
  const lines: { label: string; value: string }[] = [];

  switch (event.event_type) {
    case "payment_created":
    case "payment_updated":
    case "payment_reversed": {
      if (event.event_type === "payment_updated") {
        lines.push({ label: "Importe anterior", value: formatAmount(details.old_amount) });
      }
      lines.push({
        label: event.event_type === "payment_reversed" ? "Importe revertido" : "Importe",
        value: formatAmount(details.new_amount ?? details.amount ?? details.payment_amount),
      });
      if (typeof details.payment_date === "string") {
        lines.push({ label: "Fecha de pago", value: formatDate(details.payment_date) });
      }
      if (typeof details.payment_type === "string") {
        lines.push({ label: "Medio de pago", value: paymentMethods.get(details.payment_type) ?? details.payment_type });
      }
      break;
    }
    case "reservation_created":
    case "reservation_updated": {
      const before = asFields(details.before);
      const after = asFields(details.after);
      if (details.initial_payment != null) {
        lines.push({ label: "Adelanto inicial", value: formatAmount(details.initial_payment) });
      }
      for (const [field, label] of [["advance_payment", "Total pagado"], ["pending_payment", "Saldo pendiente"]]) {
        if (after[field] == null) continue;
        const current = formatAmount(after[field]);
        const previous = formatAmount(before[field]);
        lines.push({ label, value: before[field] != null && previous !== current ? `${previous} → ${current}` : current });
      }
      for (const [field, label] of [["register_date", "Fecha de reserva"], ["due_date", "Vencimiento"]]) {
        const previous = before[field];
        const current = after[field];
        if (typeof current !== "string" && typeof previous !== "string") continue;
        const date = typeof current === "string" ? formatDate(current) : "Sin fecha";
        lines.push({ label, value: typeof previous === "string" && previous !== current ? `${formatDate(previous)} → ${date}` : date });
      }
      for (const [field, label] of [["user_id", "Miembro"], ["trip_id", "Viaje"]]) {
        if (before[field] != null && after[field] != null && before[field] !== after[field]) {
          lines.push({ label, value: `#${before[field]} → #${after[field]}` });
        }
      }
      break;
    }
  }

  if (!lines.length) return <>Sin detalle disponible</>;
  return <ul className="audit-details">
    {lines.map(({ label, value }) => <li key={label}><strong>{label}:</strong> {value}</li>)}
  </ul>;
}


export default function Auditorias() {
  const [selected, setSelected] = useState<FinancialEvent | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const canSeeSecurity = readSessionUser()?.role === "admin";
  const [currentPage, setCurrentPage] = useState(1);
  const admin = canAccessModule(readSessionUser(), "auditorias", false);
  const page = usePagedList<FinancialEvent>(
    "/temple-amortizations/events",
    { page: currentPage, limit: RECORDS_PER_PAGE },
    admin && !showSecurity,
  );
  const totalPages = Math.max(1, Math.ceil(page.total / RECORDS_PER_PAGE));

  useEffect(() => {
    if (page.loaded && !page.loading && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, page.loaded, page.loading, totalPages]);

  if (!admin) return <p>No tienes permiso para consultar auditorías.</p>;

  const securityView = showSecurity && canSeeSecurity;
  const destination = securityView ? "Historial financiero" : "Eventos de seguridad";
  const heading = (
    <header className="audit-header">
      <h1>{securityView ? "Eventos de seguridad" : "Historial financiero"}</h1>
      {canSeeSecurity && (
        <button type="button" className="btn secondary mobile-header-action"
          aria-label={destination} title={destination} onClick={() => setShowSecurity(!securityView)}>
          {securityView ? <IoCashOutline aria-hidden="true" /> : <IoShieldCheckmarkOutline aria-hidden="true" />}
          <span>{destination}</span>
        </button>
      )}
    </header>
  );

  if (securityView) return (
    <div className="dashboard-container audit-page">
      {heading}
      <SecurityHistory />
    </div>
  );

  const labels: Record<string, string> = {
    payment_created: "Pago registrado",
    payment_updated: "Pago corregido",
    payment_reversed: "Pago revertido",
    reservation_created: "Adelanto registrado",
    reservation_updated: "Reserva corregida",
  };

  return (
    <div className="dashboard-container audit-page">
      {heading}
      {page.error && <p role="alert">{page.error}</p>}
      {page.loading && <p role="status">Cargando auditorías...</p>}
      <div className="audit-table-scroll table-container" role="region" aria-label="Movimientos de auditoría" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th className="table-desktop-only">Fecha</th>
            <th>Acción</th>
            <th className="table-desktop-only">Responsable</th>
            <th className="table-desktop-only">Reserva</th>
            <th>Detalle</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((event) => (
            <tr key={event.id}>
              <td className="table-desktop-only">{formatDateTime(event.created_at)}</td>
              <td>{labels[event.event_type] || event.event_type}</td>
              <td className="table-desktop-only">{event.actor_name || `Cuenta ${event.actor_id}`}</td>
              <td className="table-desktop-only">
                {event.reservation_member_name || "Miembro no disponible"}
                {event.reservation_id != null && <small className="audit-reservation-id">Reserva #{event.reservation_id}</small>}
              </td>
              <td><EventDetails event={event} /></td>
              <td><div className="table-record-actions"><ViewRecordButton label="Ver detalles de la auditoría" onClick={() => setSelected(event)} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {selected && <RecordDetails title="Detalle de auditoría" onClose={() => setSelected(null)} fields={[
        ["Fecha", formatDateTime(selected.created_at)], ["Acción", labels[selected.event_type] || selected.event_type],
        ["Responsable", selected.actor_name || (selected.actor_id != null ? `Cuenta ${selected.actor_id}` : "—")],
        ["Miembro", selected.reservation_member_name], ["Reserva", selected.reservation_id != null ? `#${selected.reservation_id}` : "—"],
        ["Detalle", <EventDetails event={selected} />],
      ]} />}
      {!page.items.length && !page.loading && <p>No hay movimientos de auditoría.</p>}

      <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
    </div>
  );
}
