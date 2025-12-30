/// <reference types="vite/client" />
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/users/login`, form);

      if (!res.data?.token) {
        throw new Error("No se recibió el token de autenticación.");
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);

      navigate("/dashboard");
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data?.message || "Correo o contraseña incorrectos.");
      } else if (err.request) {
        setError("No se pudo conectar con el servidor. Verifica que el Backend esté encendido en el puerto 5000.");
      } else {
        setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
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
                {loading ? "Verificando..." : "Ingresar al Sistema"}
              </button>
              
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/")}
              >
                Volver al Inicio
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