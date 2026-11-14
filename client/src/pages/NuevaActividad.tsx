import { emptyActivityFormData } from "../interfaces/Activity";
import FormModal from "../components/FormModal";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import ActivityForm from "../components/activities/FormularioActividad";
import type { ActivityFormData } from "../interfaces/Activity";

export default function NewActividad() {
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const month = query.get("mes");
  const week = query.get("semana");
  const calendarParams = new URLSearchParams();
  if (month) calendarParams.set("mes", month);
  if (week && month) calendarParams.set("semana", week);
  const returnPath = month ? `/actividades?${calendarParams}` : "/actividades";
  const day = query.get("fecha") ?? "";
  const initialValues = useMemo(() => ({
    ...emptyActivityFormData,
    activity_datetime: /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T09:00` : "",
  }), [day]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") {
      navigate(returnPath, { replace: true });
    }
  }, [navigate, returnPath]);

  async function handleCreate(data: ActivityFormData) {
    try {
      setSaving(true);
      await api.post("/activities", {
        ...data,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      });
      alert("Actividad creada correctamente.");
      navigate(returnPath, { replace: true });
    } catch {
      alert("No fue posible crear la actividad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal title="Agregar actividad" onClose={() => navigate(returnPath, { replace: true })} busy={saving}>
      <ActivityForm
        initialValues={initialValues}
        onSubmit={handleCreate}
        onCancel={() => navigate(returnPath, { replace: true })}
        loading={saving}
      />
    </FormModal>
  );
}
