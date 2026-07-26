import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import ActivityForm from "../components/activities/FormularioActividad";
import type { ActivityFormData } from "../interfaces/Activity";
import { Skeleton } from "../components/Esqueleto";
import { TbCalendarExclamation } from "react-icons/tb";

export default function EditActividad() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<ActivityFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get("/activities")
      .then(res => {
        const act = res.data.find((a: any) => a.id === id);
        if (!act) {
          alert("Actividad no encontrada.");
          navigate("/actividades");
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
        navigate("/actividades");
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
      navigate("/actividades");
    } catch {
      alert("No fue posible actualizar la actividad.");
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
            <Skeleton height="2.5rem" style={{ flex: 1 }} />
            <Skeleton height="2.5rem" style={{ flex: 1 }} />
          </div>
          <Skeleton height="8rem" />
        </div>
      </div>
    );
  }

  if (!initial) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1><span className="page-title-icon"><TbCalendarExclamation /></span> Editar Actividad</h1>
          <p>Modifica la información de la actividad.</p>
        </div>
      </div>

      <ActivityForm
        initialValues={initial}
        onSubmit={handleUpdate}
        onCancel={() => navigate("/actividades")}
        loading={saving}
      />
    </div>
  );
}
