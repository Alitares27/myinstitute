import FormModal from "../components/FormModal";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios, { isAxiosError } from "axios";

import {
    Meeting,
    MeetingRequest,
} from "../interfaces/Meeting";

import {
    getMeeting,
    updateMeeting,
} from "../services/consejos";

import MeetingForm from "../components/meetings/FormularioConsejo";
import { toYMD } from "../utils/utilidadesFecha";
import "../styles/Consejos.css";

export default function EditMeeting() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [meeting, setMeeting] = useState<MeetingRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") {
            navigate("/consejos", { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (id) {
            loadMeeting(Number(id));
        }
    }, [id]);

    async function loadMeeting(meetingId: number) {
        try {
            const data: Meeting = await getMeeting(meetingId);

            const attendeesList = data.attendees
                ? data.attendees.map((user: any) => ({
                      id: user.id,
                      status: user.status || "pending",
                  }))
                : [];

            const formData: MeetingRequest = {
                title: data.title || "",
                meeting_date: toYMD(data.meeting_date),
                start_time: data.start_time,
                end_time: data.end_time ?? "",
                topics: data.topics,
                notes: data.notes ?? "",
                status: data.status || "scheduled",
                attendees: attendeesList,
            };

            setMeeting(formData);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 401) {
                return;
            }

            alert("No fue posible cargar el consejo.");
            navigate("/consejos", { replace: true });
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdate(meetingData: MeetingRequest) {
        if (!id) return;

        try {
            setSaving(true);
            await updateMeeting(Number(id), meetingData);

            alert("Consejo actualizado correctamente.");
            navigate("/consejos", { replace: true });
        } catch (error: any) {
            if (isAxiosError(error) && error.response?.status === 401) {
                return;
            }

            const message =
                (isAxiosError(error) && error.response?.data?.message) ||
                "Error al actualizar el consejo.";

            alert(message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <FormModal title="Editar consejo" onClose={() => navigate("/consejos", { replace: true })}><p role="status">Cargando…</p></FormModal>;

    if (!meeting) {
        return <p>No se encontró el consejo.</p>;
    }

    return (
      <FormModal title="Editar consejo" onClose={() => navigate("/consejos", { replace: true })} busy={saving}>
        <MeetingForm
          initialValues={meeting}
          onSubmit={handleUpdate}
          onCancel={() => navigate("/consejos", { replace: true })}
          loading={saving}
        />
      </FormModal>
    );
}
