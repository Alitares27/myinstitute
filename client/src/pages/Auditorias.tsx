import { useEffect, useState } from "react";
import { usePagedList } from "../hooks/usePagedList";
import { formatDateTime } from "../utils/utilidadesFecha";

const RECORDS_PER_PAGE = 20;

export default function Auditorias() {
  const [currentPage, setCurrentPage] = useState(1);
  const admin = JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
  const page = usePagedList<any>(
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
    <div className="dashboard-container">
      <h1>Historial financiero</h1>
      {page.error && <p role="alert">{page.error}</p>}
      {page.loading && <p role="status">Cargando auditorías...</p>}
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
              <td>{event.reservation_id}</td>
              <td>{JSON.stringify(event.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
