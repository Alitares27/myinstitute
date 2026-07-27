import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Disposicion";
import {
  TbBuilding, TbLogin, TbUserPlus, TbSparkles,
  TbBooks, TbPencil, TbCalendar
} from "react-icons/tb";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      navigate("/panel");
    }
  }, [token, navigate]);

  return (
    <Layout>
      <div className="home-container">
        <section className="home-hero">
          <h1 className="home-title">
            <TbBuilding /> Bienvenido a GestionAR
          </h1>

          <div className="home-buttons">
            <button className="btn primary" onClick={() => navigate("/iniciar-sesion")}>
              <TbLogin /> Iniciar Sesión
            </button>
            <button className="btn secondary" onClick={() => navigate("/registrarse")}>
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
              onClick={() => navigate("/inscripciones")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/inscripciones")}
            >
              <div className="feature-icon"><TbBooks /></div>
              <h3>Cursos</h3>
              <p>Gestiona programas académicos y materiales de estudio.</p>
            </div>

            <div
              className="feature-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/calificaciones")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/calificaciones")}
            >
              <div className="feature-icon"><TbPencil /></div>
              <h3>Calificaciones</h3>
              <p>Seguimiento detallado del progreso de los miembros.</p>
            </div>

            <div
              className="feature-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate("/asistencia")}
              onKeyDown={(e) => e.key === "Enter" && navigate("/asistencia")}
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
