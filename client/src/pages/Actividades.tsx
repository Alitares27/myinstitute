import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { FiCalendar } from "react-icons/fi";
import { IoCreateOutline, IoTrashOutline, IoAddOutline } from "react-icons/io5";
import { formatDateTime, formatDateTimeLong } from "../utils/utilidadesFecha";
import { Skeleton } from "../components/Esqueleto";
import type { Activity } from "../interfaces/Activity";

export default function Actividades() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const recordsPerPage = 6;

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    setRole(user.role);

    api.get("/activities")
      .then(res => setActivities(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    try {
      await api.delete(`/activities/${id}`);
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch { }
  }

  const totalPages = Math.ceil(activities.length / recordsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return activities.slice(start, start + recordsPerPage);
  }, [activities, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  if (loading) {
    return (
      <div className="actividades-page">
        <div className="actividades-header">
          <div>
            <Skeleton width="200px" height="1.8rem" />
            <Skeleton width="280px" height="0.9rem" style={{ marginTop: "8px" }} />
          </div>
          <Skeleton width="110px" height="2.5rem" />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Actividad</th><th>Fecha</th><th>Asignada a</th></tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width={`${140 + (i % 3) * 40}px`} height="0.95rem" /></td>
                  <td><Skeleton width="110px" height="0.95rem" /></td>
                  <td><Skeleton width="100px" height="0.95rem" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="actividades-page">
      <div className="actividades-header">
        <h1><span className="page-title-icon"><FiCalendar /></span> Actividades</h1>
        <Link to="/actividades/nueva" className="btn-primary">
          Programar
        </Link>
      </div>

      <h2 className="dashboard-subtitle"><IoAddOutline /> Actividades programadas</h2>

      {activities.length === 0 ? (
        <div className="empty">
          <h3>No hay actividades registradas.</h3>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Actividad</th>
                <th>Fecha</th>
                <th>Asignada a</th>
                <th>Áreas</th>
                {role === "admin" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {currentRecords.map(a => (
                <tr key={a.id}>
                  <td>
                    <button className="link-button" onClick={() => setSelectedActivity(a)}>
                      {a.activity_name}
                    </button>
                  </td>
                  <td>{formatDateTime(a.activity_datetime)}</td>
                  <td>{a.assigned_to_name || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {a.spiritual && <span className="status-badge status-scheduled">Esp</span>}
                      {a.social && <span className="status-badge status-completed">Soc</span>}
                      {a.physical && <span className="status-badge" style={{ background: "rgba(52,199,89,0.12)", color: "#34C759" }}>Fís</span>}
                      {a.intellectual && <span className="status-badge" style={{ background: "rgba(0,122,255,0.12)", color: "#007AFF" }}>Int</span>}
                    </div>
                  </td>
                  {role === "admin" && (
                    <td>
                      <Link to={`/actividades/editar/${a.id}`} className="btn secondary extracted-style-4" aria-label="Editar">
                        <IoCreateOutline />
                      </Link>
                      <button className="btn secondary extracted-style-5" onClick={() => handleDelete(a.id)} aria-label="Eliminar">
                        <IoTrashOutline />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination-dropdown">
              <span>PÁGINA:</span>
              <select value={currentPage} onChange={e => setCurrentPage(Number(e.target.value))}>
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedActivity(null)} title="Cerrar" />
            <h2 style={{ marginTop: "8px", marginBottom: "1rem" }}>{selectedActivity.activity_name}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <DetailRow label="Fecha y hora" value={formatDateTimeLong(selectedActivity.activity_datetime)} />
              <DetailRow label="Encargado" value={selectedActivity.assigned_to_name} />
              <DetailRow label="Propósito" value={selectedActivity.purpose} />
              <DetailRow label="Descripción" value={selectedActivity.description} />
              <DetailRow label="Asistencia" value={selectedActivity.attendance + " hermanos"} />
              <DetailRow label="Presupuesto" value={selectedActivity.budget ? `$${Number(selectedActivity.budget).toLocaleString("es-AR")}` : null} />
              <DetailRow label="Asignaciones" value={selectedActivity.assignments} />
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", paddingTop: "0.5rem" }}>
                {selectedActivity.spiritual && <span className="status-badge status-scheduled">Espiritual</span>}
                {selectedActivity.social && <span className="status-badge status-completed">Social</span>}
                {selectedActivity.physical && <span className="status-badge" style={{ background: "rgba(52,199,89,0.12)", color: "#34C759" }}>Físico</span>}
                {selectedActivity.intellectual && <span className="status-badge" style={{ background: "rgba(0,122,255,0.12)", color: "#007AFF" }}>Intelectual</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>{label.toUpperCase()}</span>
      <span style={{ color: "var(--text-main)", textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
