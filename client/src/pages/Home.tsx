import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="home-container">
      <h1>🏫 Bienvenido a MyInstitute</h1>
      <p>Por favor inicia sesión o regístrate para continuar</p>
      <div className="auth-buttons">
        <button onClick={() => navigate("/login")}>🔑 Iniciar Sesión</button>
        <button onClick={() => navigate("/signup")}>📝 Registrarse</button>
      </div>
    </div>
  );
}