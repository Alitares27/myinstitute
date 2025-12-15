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
    <div className="page-container home-container">
      <div className="home-hero">
        <h1 className="home-title">🏫 Bienvenido a <span>MyInstitute</span></h1>
        <p className="home-subtitle">
          Tu plataforma académica para gestionar cursos, calificaciones y mucho más.
        </p>
        <div className="auth-buttons">
          <button className="btn primary" onClick={() => navigate("/login")}>
            🔑 Iniciar Sesión
          </button>
          <button className="btn secondary" onClick={() => navigate("/signup")}>
            📝 Registrarse
          </button>
        </div>
      </div>

      <div className="home-features">
        <h2>✨ ¿Qué puedes hacer en MyInstitute?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>📚 Cursos</h3>
            <p>Accede a tus cursos y consulta toda la información en un solo lugar.</p>
          </div>
          <div className="feature-card">
            <h3>📝 Calificaciones</h3>
            <p>Revisa tus notas y mantente al día con tu progreso académico.</p>
          </div>
          <div className="feature-card">
            <h3>👩‍🏫 Profesores</h3>
            <p>Conéctate con tus docentes y recibe retroalimentación personalizada.</p>
          </div>
          <div className="feature-card">
            <h3>📊 Dashboard</h3>
            <p>Visualiza tu rendimiento y organiza tu aprendizaje de manera sencilla.</p>
          </div>
        </div>
      </div>

      <footer className="home-footer">
        <p>© {new Date().getFullYear()} MyInstitute. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}