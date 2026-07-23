import { FormEvent, useEffect, useState } from "react";
import { MeetingRequest, AttendeeRequest } from "../../interfaces/Meeting";
import AttendeesSelector from "./AttendeesSelector";

interface Props {
    initialValues?: MeetingRequest;
    onSubmit: (meeting: MeetingRequest) => Promise<void>;
    onCancel?: () => void;
    loading?: boolean;
    showFooter?: boolean;
}

const emptyMeeting: MeetingRequest = {
    title: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    topics: "",
    notes: "",
    status: "",
    attendees: [] as AttendeeRequest[],
};

export default function MeetingForm({
    initialValues = emptyMeeting,
    onSubmit,
    onCancel,
    loading = false,
    showFooter = true,
}: Props) {
    const [meeting, setMeeting] =
        useState<MeetingRequest>(initialValues);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setMeeting(initialValues);
    }, [initialValues]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!meeting.title.trim()) {
            alert("Ingrese un título para el consejo.");
            return;
        }

        if (!meeting.meeting_date) {
            alert("Seleccione una fecha.");
            return;
        }

        if (!meeting.start_time) {
            alert("Seleccione la hora de inicio.");
            return;
        }

        if (meeting.topics.trim() === "") {
            alert("Debe ingresar los temas tratados.");
            return;
        }

        if (!meeting.status) {
            alert("Seleccione un estado.");
            return;
        }

        if (meeting.attendees.length === 0) {
            alert("Seleccione al menos un participante.");
            return;
        }

        try {
            setSaving(true);

            await onSubmit(meeting);

        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            id="meeting-form"
            onSubmit={handleSubmit}
            className="meeting-form"
        >

            <div className="form-group">

                <label>Asunto</label>

                <input
                    type="text"
                    value={meeting.title}
                    onChange={(e) =>
                        setMeeting({
                            ...meeting,
                            title: e.target.value,
                        })
                    }
                    placeholder="Ej: Consejo de Maestros - Julio 2026"
                    required
                    maxLength={200}
                />

            </div>

            <div className="form-row form-row-3">

                <div className="form-group">

                    <label>Fecha</label>

                    <input
                        type="date"
                        value={meeting.meeting_date}
                        onChange={(e) =>
                            setMeeting({
                                ...meeting,
                                meeting_date: e.target.value,
                            })
                        }
                        required
                    />

                </div>

                <div className="form-group">

                    <label>Hora inicio</label>

                    <input
                        type="time"
                        value={meeting.start_time}
                        onChange={(e) =>
                            setMeeting({
                                ...meeting,
                                start_time: e.target.value,
                            })
                        }
                        required
                    />

                </div>

                <div className="form-group">

                    <label>Hora fin</label>

                    <input
                        type="time"
                        value={meeting.end_time ?? ""}
                        onChange={(e) =>
                            setMeeting({
                                ...meeting,
                                end_time: e.target.value,
                            })
                        }
                    />

                </div>

            </div>

            <div className="form-group">

                <label>Temas tratados</label>

                <textarea
                    rows={5}
                    value={meeting.topics}
                    onChange={(e) =>
                        setMeeting({
                            ...meeting,
                            topics: e.target.value,
                        })
                    }
                    required
                />

            </div>

            <div className="form-group">

                <label>Pendientes</label>

                <textarea
                    rows={4}
                    value={meeting.notes ?? ""}
                    onChange={(e) =>
                        setMeeting({
                            ...meeting,
                            notes: e.target.value,
                        })
                    }
                />

            </div>

            <div className="form-row">

                <div className="form-group">

                    <select
                        value={meeting.status}
                        required
                        onChange={(e) =>
                            setMeeting({
                                ...meeting,
                                status: e.target.value,
                            })
                        }
                    >
                        <option value="">Selecciona estado</option>
                        <option value="scheduled">Programada</option>
                        <option value="completed">Completada</option>
                        <option value="cancelled">Cancelada</option>
                    </select>

                </div>

                <div className="form-group">

                    <AttendeesSelector
                        selectedAttendees={meeting.attendees}
                        onChange={(attendees) =>
                            setMeeting({
                                ...meeting,
                                attendees,
                            })
                        }
                    />

                </div>

            </div>

            {showFooter && (
                <div
                    style={{
                        marginTop: "30px",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "0.75rem",
                    }}
                >

                    {onCancel && (
                        <button
                            type="button"
                            className="btn cancel-btn"
                            onClick={onCancel}
                            title="Cancelar"
                            aria-label="Cancelar"
                        >
                            ✕
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={loading || saving}
                    >
                        {saving
                            ? "Guardando..."
                            : "Guardar"}
                    </button>

                </div>
            )}

        </form>
    );
}