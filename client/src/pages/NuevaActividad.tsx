import FormModal from "../components/FormModal";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ActivityForm from "../components/activities/FormularioActividad";
import type { ActivityFormData } from "../interfaces/Activity";

export default function NewActividad() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") {
      navigate("/actividades", { replace: true });
    }
  }, [navigate]);

  async function handleCreate(data: ActivityFormData) {
    try {
      setSaving(true);
      await api.post("/activities", {
        ...data,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      });
      alert("Actividad creada correctamente.");
      navigate("/actividades", { replace: true });
    } catch {
      alert("No fue posible crear la actividad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal title="Agregar actividad" onClose={() => navigate("/actividades", { replace: true })} busy={saving}>
      <ActivityForm
        onSubmit={handleCreate}
        onCancel={() => navigate("/actividades", { replace: true })}
        loading={saving}
      />
    </FormModal>
  );
}
