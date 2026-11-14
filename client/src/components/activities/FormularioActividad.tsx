import { useEffect, useState } from "react";
import { BasicUser } from "../../interfaces/Common";
import { ActivityFormData, DEFAULT_ACTIVITY_COLOR, emptyActivityFormData } from "../../interfaces/Activity";
import api from "../../api";
import "../../styles/CalendarioActividades.css";

const activityColors = [
  { name: "Azul", value: DEFAULT_ACTIVITY_COLOR },
  { name: "Verde", value: "#15803d" },
  { name: "Turquesa", value: "#0f766e" },
  { name: "Violeta", value: "#7c3aed" },
  { name: "Rosa", value: "#db2777" },
  { name: "Rojo", value: "#dc2626" },
  { name: "Naranja", value: "#ea580c" },
  { name: "Amarillo", value: "#ca8a04" },
];

interface Props {
  initialValues?: ActivityFormData;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  showFooter?: boolean;
}

export default function ActivityForm({
  initialValues = emptyActivityFormData,
  onSubmit,
  onCancel,
  loading = false,
  showFooter = true,
}: Props) {
  const [form, setForm] = useState<ActivityFormData>(initialValues);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  useEffect(() => {
    api.get("/users")
      .then(res => setUsers(res.data))
      .catch(() => {
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.activity_name.trim()) {
      alert("Ingrese el nombre de la actividad.");
      return;
    }
    if (!form.activity_datetime) {
      alert("Seleccione fecha y hora.");
      return;
    }

    try {
      setSaving(true);
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form id="activity-form" onSubmit={handleSubmit} className="activity-form">

      <div className="form-group">
        <label>Nombre de la actividad</label>
        <input
          type="text"
          name="activity_name"
          value={form.activity_name}
          onChange={handleChange}
          placeholder="Ej: Actividad de servicio comunitario"
          required
          maxLength={200}
        />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label>Fecha y hora</label>
          <input
            type="datetime-local"
            name="activity_datetime"
            value={form.activity_datetime}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Encargado</label>
          <select
            name="assigned_to"
            value={form.assigned_to}
            onChange={handleChange}
          >
            <option value="">Sin asignar</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Asistencia</label>
          <input
            type="number"
            name="attendance"
            value={form.attendance}
            onChange={handleChange}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Propósito</label>
          <textarea
            rows={4}
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            placeholder="¿Por qué estamos llevando a cabo esta actividad?"
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            rows={4}
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="¿Qué aspectos cubrirá o en qué aspectos se enfocará?"
          />
        </div>
        <div className="form-group">
          <label>Presupuesto</label>
          <input
            type="number"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            placeholder="¿Cuánto costará?"
            min="0"
          />
        </div>


      </div>

      <div className="form-row">


        <div className="form-group">
          <label>Asignaciones</label>
          <textarea
            rows={3}
            name="assignments"
            value={form.assignments}
            onChange={handleChange}
            placeholder="Materiales, responsables, etc."
          />
        </div>

        <div className="form-group">
          <label>Áreas de enfoque</label>
          <div className="activity-checkboxes">
            {(["spiritual", "social", "physical", "intellectual"] as const).map(key => (
              <label key={key} className="activity-checkbox">
                <input
                  type="checkbox"
                  name={key}
                  checked={form[key]}
                  onChange={handleChange}
                />
                <span>{key === "spiritual" ? "Espiritual" : key === "social" ? "Social" : key === "physical" ? "Físico" : "Intelectual"}</span>
              </label>
            ))}
          </div>
        </div>

      </div>



      <fieldset className="activity-color-picker">
        <legend>Color en el calendario</legend>
        <div className="activity-color-options">
          {activityColors.map(({ name, value }) => (
            <label key={value} className="activity-color-option">
              <input type="radio" name="color" value={value} aria-label={name}
                checked={form.color.toLowerCase() === value} onChange={handleChange} />
              <span aria-hidden="true" style={{ backgroundColor: value }}>✓</span>
            </label>
          ))}
        </div>
        {!activityColors.some(({ value }) => value === form.color.toLowerCase()) && (
          <small>Se conservará el color guardado hasta que elijas uno de la paleta.</small>
        )}
      </fieldset>

      {showFooter && (
        <div className="form-footer">
          {onCancel && (
            <button
              type="button"
              className="btn cancel-btn modal-close-icon"
              onClick={onCancel}
              title="Cancelar"
              aria-label="Cancelar"
            >
              ✕
            </button>
          )}
          <button type="submit" disabled={loading || saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

    </form>
  );
}
