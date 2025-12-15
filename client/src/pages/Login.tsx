import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
    <div className="auth-container">
      <h2>🔑 Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <div className="auth-buttons">
          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate("/")}
          >
            Cancelar
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}