import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  return (
    <Layout>
      <div className="home-container">
        <section className="home-hero">
          <h1 className="home-title">
            🏫 Bienvenido a <span>MyInstitute</span>
          </h1>
          <p className="home-subtitle">
            Tu plataforma académica integral para gestionar cursos, 
            asistencias y rendimiento escolar de manera eficiente.
          </p>
          
          <div className="auth-buttons">
            <button className="btn primary" onClick={() => navigate("/login")}>
              🔑 Iniciar Sesión
            </button>
            <button className="btn secondary" onClick={() => navigate("/signup")}>
              📝 Registrarse
            </button>
          </div>
        </section>

        <section className="home-features">
          <h2>✨ ¿Qué puedes hacer en MyInstitute?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Cursos</h3>
              <p>Gestiona programas académicos y materiales de estudio.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Calificaciones</h3>
              <p>Seguimiento detallado del progreso de los estudiantes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👩‍🏫</div>
              <h3>Profesores</h3>
              <p>Administra el cuerpo docente y sus asignaciones.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h3>Asistencia</h3>
              <p>Control diario de presencialidad de forma digital.</p>
            </div>
          </div>
        </section>

        <footer className="home-footer">
          <p>© {new Date().getFullYear()} MyInstitute. Gestión Educativa Moderna.</p>
        </footer>
      </div>
    </Layout>
  );
}