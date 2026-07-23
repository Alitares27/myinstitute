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
} from "../services/meetings";

import MeetingForm from "../components/meetings/MeetingForm";
import { Skeleton } from "../components/Skeleton";
import { TbCalendarExclamation } from "react-icons/tb";

export default function EditMeeting() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [meeting, setMeeting] = useState<MeetingRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                meeting_date: data.meeting_date,
                start_time: data.start_time,
                end_time: data.end_time ?? "",
                topics: data.topics,
                notes: data.notes ?? "",
                status: data.status || "scheduled",
                attendees: attendeesList,
            };

            setMeeting(formData);
        } catch (error) {
            console.error(error);

            if (isAxiosError(error) && error.response?.status === 401) {
                return;
            }

            alert("No fue posible cargar el consejo.");
            navigate("/meetings");
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
            navigate("/meetings");
        } catch (error: any) {
            console.error(error);

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

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <Skeleton width="220px" height="1.8rem" />
                        <Skeleton width="280px" height="0.9rem" style={{ marginTop: "8px" }} />
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    <Skeleton height="2.5rem" />
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <Skeleton height="2.5rem" />
                        <Skeleton height="2.5rem" />
                        <Skeleton height="2.5rem" />
                    </div>
                    <Skeleton height="8rem" />
                    <Skeleton height="6rem" />
                </div>
            </div>
        );
    }

    if (!meeting) {
        return <p>No se encontró el consejo.</p>;
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1><span className="page-title-icon"><TbCalendarExclamation /></span> Editar Consejo</h1>
                    <p>Modifica la información del consejo.</p>
                </div>
            </div>

            <MeetingForm
                initialValues={meeting}
                onSubmit={handleUpdate}
                onCancel={() => navigate("/meetings")}
                loading={saving}
            />

        </div>
    );
}
