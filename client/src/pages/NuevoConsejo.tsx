import FormModal from "../components/FormModal";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios, { isAxiosError } from "axios";
import { MeetingRequest } from "../interfaces/Meeting";
import { createMeeting } from "../services/consejos";
import MeetingForm from "../components/meetings/FormularioConsejo";
import "../styles/Consejos.css";

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

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") {
            navigate("/consejos", { replace: true });
        }
    }, [navigate]);

    async function handleCreate(meeting: MeetingRequest) {
        try {
            setSaving(true);
            await createMeeting(meeting);
            alert("El consejo fue creado correctamente.");
            navigate("/consejos", { replace: true });
        } catch (error: any) {
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
      <FormModal title="Agregar consejo" onClose={() => navigate("/consejos", { replace: true })} busy={saving}>
        <MeetingForm
          initialValues={initialValues}
          onSubmit={handleCreate}
          onCancel={() => navigate("/consejos", { replace: true })}
          loading={saving}
        />
      </FormModal>
    );
}
