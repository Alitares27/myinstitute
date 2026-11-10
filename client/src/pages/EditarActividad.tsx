import FormModal from "../components/FormModal";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import ActivityForm from "../components/activities/FormularioActividad";
import type { ActivityFormData } from "../interfaces/Activity";

export default function EditActividad() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<ActivityFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") {
      navigate("/actividades", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    api.get("/activities")
      .then(res => {
        const act = res.data.find((a: any) => String(a.id) === id);
        if (!act) {
          alert("Actividad no encontrada.");
          navigate("/actividades", { replace: true });
          return;
        }
        setInitial({
          activity_name: act.activity_name || "",
          activity_datetime: act.activity_datetime ? act.activity_datetime.slice(0, 16) : "",
          assigned_to: act.assigned_to ? String(act.assigned_to) : "",
          purpose: act.purpose || "",
          description: act.description || "",
          attendance: act.attendance || "",
          budget: act.budget || "",
          assignments: act.assignments || "",
          spiritual: act.spiritual || false,
          social: act.social || false,
          physical: act.physical || false,
          intellectual: act.intellectual || false,
        });
      })
      .catch(() => {
        alert("Error al cargar la actividad.");
        navigate("/actividades", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleUpdate(data: ActivityFormData) {
    if (!id) return;
    try {
      setSaving(true);
      await api.put(`/activities/${id}`, {
        ...data,
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
      });
      alert("Actividad actualizada correctamente.");
      navigate("/actividades", { replace: true });
    } catch {
      alert("No fue posible actualizar la actividad.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FormModal title="Editar actividad" onClose={() => navigate("/actividades", { replace: true })}><p role="status">Cargando…</p></FormModal>;

  if (!initial) return null;

  return (
    <FormModal title="Editar actividad" onClose={() => navigate("/actividades", { replace: true })} busy={saving}>
      <ActivityForm
        initialValues={initial}
        onSubmit={handleUpdate}
        onCancel={() => navigate("/actividades", { replace: true })}
        loading={saving}
      />
    </FormModal>
  );
}
