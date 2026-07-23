import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { TbCalendar, TbCheck, TbX, TbClock } from "react-icons/tb";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";

import { Meeting } from "../interfaces/Meeting";
import { Skeleton } from "../components/Skeleton";

import {
  getMeetings,
  getMeeting,
  deleteMeeting,
} from "../services/meetings";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const recordsPerPage = 5;

  useEffect(() => {
    loadMeetings();
    const token = sessionStorage.getItem("token");
    if (token) {
      axios
        .get(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setRole(res.data.role))
        .catch(() => {});
    }
  }, []);

  async function loadMeetings() {
    try {
      setLoading(true);
      const data = await getMeetings();
      setMeetings(data);
    } catch (error) {
      console.error(error);
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
      console.error(error);
      if (isAxiosError(error) && error.response?.status === 401) return;
      alert("No fue posible eliminar el consejo.");
    }
  }

  async function handleViewMeeting(id: number) {
    try {
      setLoadingDetail(true);
      const data = await getMeeting(id);
      setSelectedMeeting(data);
    } catch (error) {
      console.error(error);
      alert("No fue posible cargar el consejo.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function formatTime(time?: string | null) {
    if (!time) return "--";
    return time.substring(0, 5);
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
         

        <Link
          to="/meetings/new"
          className="btn-primary"
        >
          Programar
        </Link>

      </div>
<h2 className="dashboard-subtitle">Consejos registrados</h2>
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
                      {meeting.status === "scheduled" ? "Programada" :
                        meeting.status === "completed" ? "Completada" :
                          meeting.status === "cancelled" ? "Cancelada" : meeting.status || "Programada"}
                    </span>
                  </td>
                  {role === "admin" && (
                    <td>
                      <Link to={`/meetings/edit/${meeting.id}`} className="btn secondary extracted-style-4">
                        <IoCreateOutline />
                      </Link>
                      <button
                        className="btn secondary extracted-style-5"
                        onClick={() => handleDelete(meeting.id!)}
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
                          {selectedMeeting.status === "scheduled" ? "Programada" :
                            selectedMeeting.status === "completed" ? "Completada" :
                              selectedMeeting.status === "cancelled" ? "Cancelada" : selectedMeeting.status}
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

                <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn secondary" onClick={() => setSelectedMeeting(null)}>Cerrar</button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
