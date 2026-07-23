import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { MeetingRequest } from "../interfaces/Meeting";
import { createMeeting } from "../services/meetings";
import MeetingForm from "../components/meetings/MeetingForm";
import { TbCalendarPlus } from "react-icons/tb";

const initialValues: MeetingRequest = {
    title: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    topics: "",
    notes: "",
    status: "scheduled",
    attendees: [],
};

export default function NewMeeting() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);

    async function handleCreate(meeting: MeetingRequest) {
        try {
            setSaving(true);
            await createMeeting(meeting);
            alert("El consejo fue creado correctamente.");
            navigate("/meetings");
        } catch (error: any) {
            console.error(error);

            if (isAxiosError(error) && error.response?.status === 401) {
                return;
            }

            const message =
                (isAxiosError(error) && error.response?.data?.message) ||
                "No fue posible crear el consejo.";

            alert(message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1><span className="page-title-icon"><TbCalendarPlus /></span> Programar</h1>
                    <p>Registra la información del consejo.</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate("/meetings")}
                    >
                        Atrás
                    </button>
                    <button
                        type="submit"
                        form="meeting-form"
                        disabled={saving}
                        style={{ color: "white"}}
                    >
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>

            <MeetingForm
                initialValues={initialValues}
                onSubmit={handleCreate}
                loading={saving}
                showFooter={false}
            />
        </div>
    );
}