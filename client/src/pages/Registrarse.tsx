import FormModal from "../components/FormModal";
import { invalidarCache } from "../utils/clienteCache";
import { limpiarSesion } from "../utils/sesion";
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    telefono: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/users/register", form);

      invalidarCache();
      await limpiarSesion();
      localStorage.setItem("token", res.data.token);
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", res.data.user.role);
      }

      navigate("/panel");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormModal title="Crear cuenta" onClose={() => navigate("/iniciar-sesion", { replace: true })} busy={loading}>
  <form onSubmit={handleSubmit} className="auth-form">
    <div className="form-group">
      <label>Nombre Completo</label>
      <input
        type="text"
        placeholder="Juan Pérez"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />
    </div>

    <div className="form-group">
      <label>Correo Electrónico</label>
      <input
        type="email"
        placeholder="correo@ejemplo.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />
    </div>

    <div className="form-group">
      <label>Contraseña</label>
      <input
        type="password"
        placeholder="Mínimo 6 caracteres"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />
    </div>

    <div className="form-group">
      <label>Teléfono</label>
      <input
        type="text"
        placeholder="+54 9 1234 5678"
        value={form.telefono}
        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        required
      />
    </div>

    <div className="form-group">
      <label>Tipo de Usuario</label>
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
      >
        <option value="student">Miembro</option>
      </select>
    </div>

    {error && <p className="error-message">{error}</p>}

    <div className="auth-buttons">
      <button type="submit" className="btn-login" disabled={loading}>
        {loading ? "Registrando..." : "Registrarse"}
      </button>
      <button
        type="button"
        className="btn secondary"
        onClick={() => navigate("/iniciar-sesion", { replace: true })}
      >
        Cancelar
      </button>
    </div>
  </form>

    </FormModal>
  );
}
