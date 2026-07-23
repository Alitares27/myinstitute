import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
  TbBuilding, TbLogin, TbUserPlus, TbSparkles,
  TbBooks, TbPencil, TbCalendar
} from "react-icons/tb";

export default function Home() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

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
            <TbBuilding /> Bienvenido a <span>GestionAR</span>
          </h1>

          <div className="auth-buttons">
            <button className="btn primary" onClick={() => navigate("/login")}>
              <TbLogin /> Iniciar Sesión
            </button>
            <button className="btn secondary" onClick={() => navigate("/signup")}>
              <TbUserPlus /> Registrarse
            </button>
          </div>
        </section>

        <section className="home-features">
          <h2><TbSparkles /> ¿Qué puedes hacer aquí?</h2>

          <div className="features-grid">
            <div
              className="feature-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/courses")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/courses")}
            >
              <div className="feature-icon"><TbBooks /></div>
              <h3>Cursos</h3>
              <p>Gestiona programas académicos y materiales de estudio.</p>
            </div>

            <div
              className="feature-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/grades")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/grades")}
            >
              <div className="feature-icon"><TbPencil /></div>
              <h3>Calificaciones</h3>
              <p>Seguimiento detallado del progreso de los miembros.</p>
            </div>

            <div
              className="feature-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/attendance")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/attendance")}
            >
              <div className="feature-icon"><TbCalendar /></div>
              <h3>Asistencia</h3>
              <p>Control diario de presencialidad de forma digital.</p>
            </div>
          </div>
        </section>

        <footer className="home-footer">
          <p>© {new Date().getFullYear()} GestionAR.</p>
        </footer>
      </div>
    </Layout>
  );
}
