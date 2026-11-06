import { useEffect, useState } from "react";
import { usePagedList } from "../hooks/usePagedList";
import { formatDate, formatDateTime } from "../utils/utilidadesFecha";

const RECORDS_PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(1);
  const admin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
  const page = usePagedList<FinancialEvent>(
    "/temple-amortizations/events",
    { page: currentPage, limit: RECORDS_PER_PAGE },
    admin,
  );
  const totalPages = Math.max(1, Math.ceil(page.total / RECORDS_PER_PAGE));

  useEffect(() => {
    if (page.loaded && !page.loading && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, page.loaded, page.loading, totalPages]);

  if (!admin) return <p>Solo los administradores pueden consultar auditorías.</p>;

  const labels: Record<string, string> = {
    payment_created: "Pago registrado",
    payment_updated: "Pago corregido",
    payment_reversed: "Pago revertido",
    reservation_created: "Adelanto registrado",
    reservation_updated: "Reserva corregida",
  };

  return (
    <div className="dashboard-container audit-page">
      <h1>Historial financiero</h1>
      {page.error && <p role="alert">{page.error}</p>}
      {page.loading && <p role="status">Cargando auditorías...</p>}
      <div className="audit-table-scroll table-container" role="region" aria-label="Movimientos de auditoría" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Responsable</th>
            <th>Reserva</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((event) => (
            <tr key={event.id}>
              <td>{formatDateTime(event.created_at)}</td>
              <td>{labels[event.event_type] || event.event_type}</td>
              <td>{event.actor_name || `Cuenta ${event.actor_id}`}</td>
              <td>
                {event.reservation_member_name || "Miembro no disponible"}
                {event.reservation_id != null && <small className="audit-reservation-id">Reserva #{event.reservation_id}</small>}
              </td>
              <td><EventDetails event={event} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {!page.items.length && !page.loading && <p>No hay movimientos de auditoría.</p>}

      {totalPages > 1 && (
        <nav className="pagination-dropdown" aria-label="Paginación de auditorías">
          <span>PÁGINA:</span>
          <select
            aria-label="Página de auditorías"
            value={currentPage}
            onChange={(event) => setCurrentPage(Number(event.target.value))}
          >
            {Array.from({ length: totalPages }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1} de {totalPages}
              </option>
            ))}
          </select>
        </nav>
      )}
    </div>
  );
}
