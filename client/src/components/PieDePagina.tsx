import "../styles/PieDePagina.css";

export default function PieDePagina() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <p className="footer-copy">
          © {currentYear} GestionAR. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
