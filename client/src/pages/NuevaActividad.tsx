import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ActivityForm from "../components/activities/FormularioActividad";
import type { ActivityFormData } from "../interfaces/Activity";
import { TbCalendarPlus } from "react-icons/tb";

export default function NewActividad() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role !== "admin") {
      navigate("/actividades");
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
      navigate("/actividades");
    } catch {
      alert("No fue posible crear la actividad.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1><span className="page-title-icon"><TbCalendarPlus /></span>Programar Actividad</h1>
          <p>Registra la información de la actividad.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" className="btn secondary" onClick={() => navigate("/actividades")}>
            Atrás
          </button>
          <button type="submit" form="activity-form" className="btn primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <ActivityForm
        onSubmit={handleCreate}
        loading={saving}
        showFooter={false}
      />
    </div>
  );
}
