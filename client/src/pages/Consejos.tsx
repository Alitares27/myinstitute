import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TbCalendar, TbCheck, TbX, TbClock, TbPrinter } from "react-icons/tb";
import { IoCreateOutline, IoTrashOutline, IoAddOutline } from "react-icons/io5";

import { Meeting } from "../interfaces/Meeting";
import { Skeleton } from "../components/Esqueleto";
import axios, { isAxiosError } from "axios";
import api from "../api";

import {
  getMeetings,
  getMeeting,
  deleteMeeting,
} from "../services/consejos";
import {
  etiquetaEstadoConsejo,
  generarPDFConsejos,
} from "../utils/pdfConsejos";
import "../styles/Consejos.css";

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const recordsPerPage = 5;
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedToPrint, setSelectedToPrint] = useState<number[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMeetings();
    api.get("/users/me")
      .then((res) => setRole(res.data.role))
      .catch(() => { });
  }, []);

  async function loadMeetings() {
    try {
      setLoading(true);
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) return;
      alert("Error obteniendo consejos");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = window.confirm("¿Desea eliminar este consejo?");
    if (!ok) return;
    try {
      await deleteMeeting(id);
      loadMeetings();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) return;
      alert("No fue posible eliminar el consejo.");
    }
  }

  async function handleViewMeeting(id: number) {
    try {
      setLoadingDetail(true);
      const data = await getMeeting(id);
      setSelectedMeeting(data);
    } catch {
      alert("No fue posible cargar el consejo.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function formatTime(time?: string | null) {
    if (!time) return "--";
    return time.substring(0, 5);
  }

  /* -----------------------------------------
     Impresión en PDF
     ----------------------------------------- */
  const consejosConId = useMemo(
    () => meetings.filter((meeting) => meeting.id != null),
    [meetings]
  );

  const todosSeleccionados =
    consejosConId.length > 0 && selectedToPrint.length === consejosConId.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedToPrint.length > 0 && selectedToPrint.length < consejosConId.length;
    }
  }, [selectedToPrint, consejosConId.length]);

  useEffect(() => {
    if (!isPrintModalOpen) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generatingPDF) setIsPrintModalOpen(false);
    };

    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [isPrintModalOpen, generatingPDF]);

  function openPrintModal() {
    setSelectedToPrint(consejosConId.map((meeting) => meeting.id!));
    setIsPrintModalOpen(true);
  }

  function closePrintModal() {
    if (generatingPDF) return;
    setIsPrintModalOpen(false);
  }

  function toggleConsejoParaImprimir(id: number) {
    setSelectedToPrint((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleTodosParaImprimir() {
    setSelectedToPrint(
      todosSeleccionados ? [] : consejosConId.map((meeting) => meeting.id!)
    );
  }

  async function handleGenerarPDF() {
    const seleccionados = consejosConId.filter((meeting) =>
      selectedToPrint.includes(meeting.id!)
    );

    if (seleccionados.length === 0) return;

    try {
      setGeneratingPDF(true);
      await generarPDFConsejos(seleccionados);
      setIsPrintModalOpen(false);
    } catch (error) {
      console.error("Error generando el PDF:", error);
      alert("No fue posible generar el archivo PDF.");
    } finally {
      setGeneratingPDF(false);
    }
  }

  const totalPages = Math.ceil(meetings.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return meetings.slice(firstIdx, lastIdx);
  }, [meetings, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading) {
    return (
      <div className="meetings-page">
        <div className="meetings-header">
          <div>
            <Skeleton width="200px" height="1.8rem" />
            <Skeleton width="280px" height="0.9rem" style={{ marginTop: "8px" }} />
          </div>
          <Skeleton width="110px" height="2.5rem" />
        </div>
        <Skeleton width="180px" height="1.1rem" style={{ marginBottom: "16px" }} />
        <div className="table-container">
          <table className="meetings-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Creador</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td><Skeleton width={`${140 + (i % 3) * 40}px`} height="0.95rem" /></td>
                  <td><Skeleton width="90px" height="0.95rem" /></td>
                  <td><Skeleton width="110px" height="0.95rem" /></td>
                  <td><Skeleton width={`${100 + (i % 2) * 30}px`} height="0.95rem" /></td>
                  <td><Skeleton width="100px" height="1.5rem" style={{ borderRadius: "12px" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="meetings-page">

      <div className="meetings-header">

        <h1><span className="page-title-icon"><TbCalendar /></span> Consejos</h1>

        <div className="page-actions">
          <button
            type="button"
            className="btn secondary print-trigger"
            onClick={openPrintModal}
            disabled={meetings.length === 0}
            title="Imprimir consejos en un archivo PDF"
          >
            <TbPrinter /> Imprimir
          </button>

          {role === "admin" && (
            <Link
              to="/consejos/nuevo"
              className="btn-primary"
            >
              Programar
            </Link>
          )}
        </div>

      </div>
      <h2 className="dashboard-subtitle"><IoAddOutline /> Consejos registrados</h2>
      {meetings.length === 0 ? (
        <div className="empty">
          <h3>No hay Consejos registrados.</h3>
        </div>
      ) : (

        <div className="table-container">
          <table className="meetings-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Creador</th>
                <th>Estado</th>
                {role === "admin" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((meeting) => (
                <tr key={meeting.id}>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => handleViewMeeting(meeting.id!)}
                    >
                      {meeting.title}
                    </button>
                  </td>
                  <td>{new Date(meeting.meeting_date).toLocaleDateString()}</td>
                  <td>{meeting.start_time}{" - "}{meeting.end_time || "--"}</td>
                  <td>{meeting.created_by_name}</td>
                  <td>
                    <span className={`status-badge status-${meeting.status || "scheduled"}`}>
                      {etiquetaEstadoConsejo(meeting.status)}
                    </span>
                  </td>
                  {role === "admin" && (
                    <td>
                      <Link to={`/consejos/editar/${meeting.id}`} className="btn secondary extracted-style-4" aria-label="Editar">
                        <IoCreateOutline />
                      </Link>
                      <button
                        className="btn secondary extracted-style-5"
                        onClick={() => handleDelete(meeting.id!)}
                        aria-label="Eliminar"
                      >
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
              <span>PAGINA:</span>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
                ))}
              </select>
            </div>
          )}
        </div>

      )}

      {selectedMeeting && (
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMeeting(null)} title="Cerrar" />
            {loadingDetail ? (
              <p>Cargando consejo...</p>
            ) : (
              <div className="meeting-details">

                <div className="meeting-details-header">
                  <div>
                    <h1>{selectedMeeting.title}</h1>
                    <p><strong>Fecha:</strong> {new Date(selectedMeeting.meeting_date).toLocaleDateString("es-AR")}</p>
                    <p><strong>Horario:</strong> {formatTime(selectedMeeting.start_time)} - {formatTime(selectedMeeting.end_time)}</p>
                    <p><strong>Creada por:</strong> {selectedMeeting.created_by_name}</p>
                    {selectedMeeting.status && (
                      <p>
                        <strong>Estado:</strong>{" "}
                        <span className={`status-badge status-${selectedMeeting.status}`}>
                          {etiquetaEstadoConsejo(selectedMeeting.status)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="meeting-section">
                  <h2>Temas tratados</h2>
                  <div className="meeting-box">{selectedMeeting.topics}</div>
                </div>

                <div className="meeting-section">
                  <h2>Observaciones</h2>
                  <div className="meeting-box">
                    {selectedMeeting.notes?.trim() ? selectedMeeting.notes : "Sin observaciones."}
                  </div>
                </div>

                <div className="meeting-section">
                  <h2>Participantes ({selectedMeeting.attendees.length})</h2>
                  {selectedMeeting.attendees.length === 0 ? (
                    <p>No hay participantes registrados.</p>
                  ) : (
                    <div className="participants-grid">
                      {selectedMeeting.attendees.map((user) => (
                        <div key={user.id} className="participant-card">
                          <h4>{user.name}</h4>
                          <span className={`attendee-status-badge status-${user.status}`}>
                            {user.status === "confirmed"
                              ? <><TbCheck /> Confirmado</>
                              : user.status === "declined"
                                ? <><TbX /> Rechazado</>
                                : <><TbClock /> Pendiente</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
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
              <h2 id="print-modal-title"><TbPrinter /> Imprimir consejos</h2>
              <p>Seleccione los consejos que desea incluir en el archivo PDF.</p>
            </div>

            <div className="print-modal-toolbar">
              <label className="print-select-all">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="print-check"
                  checked={todosSeleccionados}
                  onChange={toggleTodosParaImprimir}
                  disabled={generatingPDF}
                />
                <span>Seleccionar todos</span>
              </label>

              <span className="print-count">
                {selectedToPrint.length} de {consejosConId.length} seleccionados
              </span>
            </div>

            <div className="print-list">
              {consejosConId.map((meeting) => {
                const seleccionado = selectedToPrint.includes(meeting.id!);

                return (
                  <label
                    key={meeting.id}
                    className={`print-option ${seleccionado ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="print-check"
                      checked={seleccionado}
                      onChange={() => toggleConsejoParaImprimir(meeting.id!)}
                      disabled={generatingPDF}
                    />

                    <span className="print-option-info">
                      <span className="print-option-title">{meeting.title}</span>
                      <span className="print-option-meta">
                        <TbCalendar />
                        {new Date(meeting.meeting_date).toLocaleDateString("es-AR")}
                        <span className="print-meta-separator">·</span>
                        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                        <span className="print-meta-separator">·</span>
                        {meeting.created_by_name || "Sin creador"}
                      </span>
                    </span>

                    <span className={`status-badge status-${meeting.status || "scheduled"}`}>
                      {etiquetaEstadoConsejo(meeting.status)}
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
