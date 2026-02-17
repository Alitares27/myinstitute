/// <reference types="vite/client" />
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false, 
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/users/login`, form, axiosConfig);

      if (!res.data?.token) {
        throw new Error("No se recibió el token de autenticación.");
      }

      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("user", JSON.stringify(res.data.user));
      sessionStorage.setItem("role", res.data.user.role);

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err); 
      
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError("No se pudo conectar con el servidor. Verifica que el backend esté activo.");
      } else if (err.response?.status === 0) {
        setError("Error de CORS: El servidor no permite conexiones desde este dominio.");
      } else if (err.response) {
        setError(err.response.data?.message || "Correo o contraseña incorrectos.");
      } else if (err.request) {
        setError("No hay respuesta del servidor. Verifica la conexión a internet.");
      } else {
        setError("Error inesperado. Inténtalo nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="auth-page-wrapper">
        <div className="auth-container card">
          <div className="auth-header">
            <h2>🔑 Iniciar Sesión</h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="********"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="error-container">
                <p className="error-message">⚠️ {error}</p>
              </div>
            )}

            <div className="auth-buttons">
              <button
                type="submit"
                className="btn-login"
                disabled={loading}
              >
                {loading ? "⏳ Iniciando..." : "🚀 Ingresar"}
              </button>

              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                ← Volver
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p>
              ¿No tienes una cuenta?{" "}
              <span
                onClick={() => navigate("/signup")}
                className="auth-link"
              >
                Regístrate aquí
              </span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
