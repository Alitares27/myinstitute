import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

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
      const res = await axios.post("http://localhost:5000/api/users/login", form);

      if (!res.data?.token) {
        throw new Error("No se recibió token desde el servidor");
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);

      navigate("/dashboard");
    } catch (err: any) {
      console.error("❌ Login error:", err);
      if (err.response) {
        setError(err.response.data?.message || "Error en el servidor");
      } else if (err.request) {
        setError("No se pudo conectar con el servidor");
      } else {
        setError("Error desconocido al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="auth-page-wrapper">
        <div className="auth-container card">
          <h2>🔑 Iniciar Sesión</h2>
          <p className="auth-subtitle">Ingresa tu Usuario y Contraseña</p>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="auth-buttons">
              <button type="submit" className="btn-login" disabled={loading}>
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
            <p>¿No tienes una cuenta? <span onClick={() => navigate("/signup")} style={{color: '#007bff', cursor: 'pointer'}}>Regístrate aquí</span></p>
          </div>
        </div>
      </div>
    </Layout>
  );
}