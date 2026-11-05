import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TbLogin, TbUserPlus } from "react-icons/tb";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      navigate("/panel");
    }
  }, [token, navigate]);

  return (
    <div className="public-home-shell">
      <header className="public-home-brand">
        <img src="/temple.webp" alt="" width="44" height="44" />
        <span>GestionAR</span>
      </header>
      <main className="public-home-main">
        <section className="public-home-hero">
          <span className="public-home-eyebrow">Gestión más simple</span>
          <h1>Todo organizado en un solo lugar.</h1>
          <p>Administra cursos, miembros y actividades con GestionAR.</p>
          <div className="home-buttons public-home-actions">
            <button className="btn primary" onClick={() => navigate("/iniciar-sesion")}>
              <TbLogin /> Iniciar sesión
            </button>
            <button className="btn secondary" onClick={() => navigate("/registrarse")}>
              <TbUserPlus /> Registrarse
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
