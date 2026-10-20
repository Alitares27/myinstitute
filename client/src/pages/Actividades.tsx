import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { FiCalendar, FiPrinter } from "react-icons/fi";
import { IoCreateOutline, IoTrashOutline, IoAddOutline } from "react-icons/io5";
import { formatDateTime, formatDateTimeLong } from "../utils/utilidadesFecha";
import { generarPDFActividades } from "../utils/pdfActividades";
import { Skeleton } from "../components/Esqueleto";
import type { Activity } from "../interfaces/Activity";

export default function Actividades() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const recordsPerPage = 6;
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedToPrint, setSelectedToPrint] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
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

  /* -----------------------------------------
     Impresión en PDF
     ----------------------------------------- */
  const actividadesConId = useMemo(
    () => activities.filter((actividad) => Boolean(actividad.id)),
    [activities]
  );

  const todasSeleccionadas =
    actividadesConId.length > 0 &&
    selectedToPrint.length === actividadesConId.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedToPrint.length > 0 &&
        selectedToPrint.length < actividadesConId.length;
    }
  }, [selectedToPrint, actividadesConId.length]);

  useEffect(() => {
    if (!isPrintModalOpen) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generatingPDF) setIsPrintModalOpen(false);
    };

    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [isPrintModalOpen, generatingPDF]);

  function openPrintModal() {
    setSelectedToPrint(actividadesConId.map((actividad) => actividad.id));
    setIsPrintModalOpen(true);
  }

  function closePrintModal() {
    if (generatingPDF) return;
    setIsPrintModalOpen(false);
  }

  function toggleActividadParaImprimir(id: string) {
    setSelectedToPrint(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }

  function toggleTodasParaImprimir() {
    setSelectedToPrint(
      todasSeleccionadas ? [] : actividadesConId.map((actividad) => actividad.id)
    );
  }

  async function handleGenerarPDF() {
    const seleccionadas = actividadesConId.filter((actividad) =>
      selectedToPrint.includes(actividad.id)
    );

    if (seleccionadas.length === 0) return;

    try {
      setGeneratingPDF(true);
      await generarPDFActividades(seleccionadas);
      setIsPrintModalOpen(false);
    } catch (error) {
      console.error("Error generando el PDF:", error);
      alert("No fue posible generar el archivo PDF.");
    } finally {
      setGeneratingPDF(false);
    }
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

        <div className="page-actions">
          <button
            type="button"
            className="btn secondary print-trigger"
            onClick={openPrintModal}
            disabled={activities.length === 0}
            title="Imprimir actividades en un archivo PDF"
          >
            <FiPrinter /> Imprimir
          </button>

          {role === "admin" && (
            <Link to="/actividades/nueva" className="btn-primary">
              Programar
            </Link>
          )}
        </div>
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
                      {a.physical && <span className="status-badge status-completed">Fís</span>}
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

      {isPrintModalOpen && (
        <div className="modal-overlay" onClick={closePrintModal}>
          <div
            className="modal-content print-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="print-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={closePrintModal}
              title="Cerrar"
              disabled={generatingPDF}
            />

            <div className="print-modal-header">
              <h2 id="print-modal-title"><FiPrinter /> Imprimir actividades</h2>
              <p>Seleccione las actividades que desea incluir en el archivo PDF.</p>
            </div>

            <div className="print-modal-toolbar">
              <label className="print-select-all">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="print-check"
                  checked={todasSeleccionadas}
                  onChange={toggleTodasParaImprimir}
                  disabled={generatingPDF}
                />
                <span>Seleccionar todas</span>
              </label>

              <span className="print-count">
                {selectedToPrint.length} de {actividadesConId.length} seleccionadas
              </span>
            </div>

            <div className="print-list">
              {actividadesConId.map((actividad) => {
                const seleccionada = selectedToPrint.includes(actividad.id);

                return (
                  <label
                    key={actividad.id}
                    className={`print-option ${seleccionada ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="print-check"
                      checked={seleccionada}
                      onChange={() => toggleActividadParaImprimir(actividad.id)}
                      disabled={generatingPDF}
                    />

                    <span className="print-option-info">
                      <span className="print-option-title">{actividad.activity_name}</span>
                      <span className="print-option-meta">
                        <FiCalendar />
                        {formatDateTime(actividad.activity_datetime)}
                        <span className="print-meta-separator">·</span>
                        {actividad.assigned_to_name || "Sin encargado"}
                      </span>
                    </span>

                    <span className="print-areas">
                      {actividad.spiritual && <span className="print-area">Espiritual</span>}
                      {actividad.social && <span className="print-area">Social</span>}
                      {actividad.physical && <span className="print-area">Físico</span>}
                      {actividad.intellectual && <span className="print-area">Intelectual</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="print-modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={closePrintModal}
                disabled={generatingPDF}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={handleGenerarPDF}
                disabled={selectedToPrint.length === 0 || generatingPDF}
              >
                {generatingPDF ? "Generando PDF…" : "Generar PDF"}
              </button>
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
