import { invalidarCache } from "../utils/clienteCache";
import { limpiarSesion } from "../utils/sesion";
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Disposicion";
import { TbLogin, TbAlertTriangle, TbEye, TbEyeOff } from "react-icons/tb";
import { synchronizePendingChanges } from "../services/offlineSync";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const credentials = { email: String(fields.get("email") ?? ""), password: String(fields.get("password") ?? "") };
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/users/login", credentials);

      if (!res.data?.token) {
        throw new Error("No se recibió el token de autenticación.");
      }

      invalidarCache();
      await limpiarSesion();
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);
      void synchronizePendingChanges();

      navigate("/panel");
    } catch (err: any) {
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
            <h2><TbLogin /> Iniciar Sesión</h2>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                required
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="login-password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-controls="password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <TbEyeOff aria-hidden="true" /> : <TbEye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-container">
                <p className="error-message"><TbAlertTriangle /> {error}</p>
              </div>
            )}

            <div className="auth-buttons">
              <button
                type="submit"
                className="btn-login"
                disabled={loading}
              >
                {loading ? "Iniciando..." : "Ingresar"}
              </button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p>
              ¿No tienes una cuenta?{" "}
              <span
                onClick={() => navigate("/registrarse")}
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
