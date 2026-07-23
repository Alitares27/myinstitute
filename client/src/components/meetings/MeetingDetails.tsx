import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Meeting } from "../../interfaces/Meeting";
import { getMeeting } from "../../services/meetings";
import { TbCheck, TbX, TbClock } from "react-icons/tb";

export default function MeetingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadMeeting(Number(id));
        }
    }, [id]);

    async function loadMeeting(meetingId: number) {
        try {
            const data = await getMeeting(meetingId);
            setMeeting(data);
        } catch (error) {
            console.error(error);
            alert("No fue posible cargar la reunión.");
            navigate("/meetings");
        } finally {
            setLoading(false);
        }
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString("es-AR");
    }

    function formatTime(time?: string | null) {
        if (!time) return "--";
        return time.substring(0, 5);
    }

    if (loading) {
        return <p>Cargando reunión...</p>;
    }

    if (!meeting) {
        return <p>La reunión no existe.</p>;
    }

    return (
        <div className="meeting-details">

            <div className="meeting-details-header">

                <div>
                    <h1>{meeting.title || "Detalle de la reunión"}</h1>

                    <p>
                        <strong>Fecha:</strong>{" "}
                        {formatDate(meeting.meeting_date)}
                    </p>

                    <p>
                        <strong>Horario:</strong>{" "}
                        {formatTime(meeting.start_time)}
                        {" - "}
                        {formatTime(meeting.end_time)}
                    </p>

                    <p>
                        <strong>Creada por:</strong>{" "}
                        {meeting.created_by_name}
                    </p>

                    {meeting.status && (
                        <p>
                            <strong>Estado:</strong>{" "}
                            <span className={`status-badge status-${meeting.status}`}>
                                {meeting.status === "scheduled" ? "Programada" :
                                    meeting.status === "completed" ? "Completada" :
                                        meeting.status === "cancelled" ? "Cancelada" : meeting.status}
                            </span>
                        </p>
                    )}
                </div>

                <div className="meeting-actions">

                    <Link
                        className="btn-warning"
                        to={`/meetings/edit/${meeting.id}`}
                    >
                        Editar
                    </Link>

                    <button
                        className="btn-secondary"
                        onClick={() => navigate("/meetings")}
                    >
                        Cancelar
                    </button>

                </div>

            </div>

            <div className="meeting-section">

                <h2>Temas tratados</h2>

                <div className="meeting-box">
                    {meeting.topics}
                </div>

            </div>

            <div className="meeting-section">

                <h2>Observaciones</h2>

                <div className="meeting-box">
                    {meeting.notes?.trim()
                        ? meeting.notes
                        : "Sin observaciones."}
                </div>

            </div>

            <div className="meeting-section">

                <h2>
                    Participantes ({meeting.attendees.length})
                </h2>

                {meeting.attendees.length === 0 ? (
                    <p>No hay participantes registrados.</p>
                ) : (
                    <div className="participants-grid">

                        {meeting.attendees.map((user) => (

                            <div
                                key={user.id}
                                className="participant-card"
                            >
                                <h4>{user.name}</h4>

                                

                                <span className={`role ${user.role}`}>
                                    {user.role}
                                </span>

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
    );
}