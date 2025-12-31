import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
      const res = await axios.post(`${API_BASE_URL}/users/register`, form);

      sessionStorage.setItem("token", res.data.token);
      if (res.data.user) {
        sessionStorage.setItem("user", JSON.stringify(res.data.user));
        sessionStorage.setItem("role", res.data.user.role);
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="auth-page-wrapper">
        <div className="auth-container card">
          <h2>📝 Crear Cuenta</h2>
          <p className="auth-subtitle">Registrate</p>

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
                <option value="student">Estudiante</option>
                <option value="teacher">Maestro</option>
              </select>
            </div>

            {error && <p className="error-message" style={{ color: "red" }}>{error}</p>}

            <div className="auth-buttons">
              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? "Registrando..." : "Registrar Cuenta"}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/")}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p>
              ¿Ya tienes cuenta?{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ color: "#007bff", cursor: "pointer", fontWeight: "bold" }}
              >
                Inicia sesión aquí
              </span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}