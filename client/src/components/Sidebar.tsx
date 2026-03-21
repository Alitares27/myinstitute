import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaBookOpen,
  FaCalendarCheck,
  FaUser,
  FaStar,
  FaSignOutAlt,
  FaSynagogue,
  FaChevronDown,
  FaGraduationCap,
  FaTools,
  FaUserTie,
  FaMicrophone,
  FaUsers,
  FaMoneyBillWave,
  FaFileInvoice,
  FaBars,
  FaTimes,
  FaSun,
  FaMoon
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const [isTeachingOpen, setIsTeachingOpen] = useState(false);
  const [isLeadershipOpen, setIsLeadershipOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  const getChevronStyle = (isOpen: boolean) => ({
    marginLeft: "auto",
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.3s",
  });

  return (
    <div className={`sidebar ${isMenuOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <Link to="/dashboard" className="sidebar-logo" onClick={() => setIsMenuOpen(false)}>
          <img
            src="/church.PNG"
            alt="Logo"
            className="logo-icon"
            style={{ width: "40px", height: "40px", objectFit: "contain" }}
          />
          <span className="logo-text">GestionAR</span>
        </Link>
        <div className="sidebar-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <nav>
          <ul>
            <li>
              <div className="sidebar-link" onClick={() => setIsTeachingOpen(!isTeachingOpen)} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><FaGraduationCap className="icon" /></div>
                <span>Enseñanza</span>
                <FaChevronDown style={getChevronStyle(isTeachingOpen)} />
              </div>

              {isTeachingOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><Link to="/students" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaUserGraduate className="icon" /></div><span>Estudiantes</span></Link></li>
                  <li><Link to="/teachers" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaChalkboardTeacher className="icon" /></div><span>Maestros</span></Link></li>
                  <li><Link to="/enrollments" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaClipboardList className="icon" /></div><span>Matrículas</span></Link></li>
                  <li><Link to="/courses" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaBookOpen className="icon" /></div><span>Cursos</span></Link></li>
                  <li><Link to="/attendance" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaCalendarCheck className="icon" /></div><span>Asistencia</span></Link></li>
                  <li><Link to="/grades" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaStar className="icon" /></div><span>Calificaciones</span></Link></li>
                </ul>
              )}
            </li>

            <li>
              <div className="sidebar-link" onClick={() => setIsLeadershipOpen(!isLeadershipOpen)} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><FaUserTie className="icon" /></div>
                <span>Liderazgo</span>
                <FaChevronDown style={getChevronStyle(isLeadershipOpen)} />
              </div>

              {isLeadershipOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><Link to="/discursantes" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaMicrophone className="icon" /></div><span>Discursantes</span></Link></li>
                  <li><Link to="/consejos" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaUsers className="icon" /></div><span>Consejos</span></Link></li>
                  <li><Link to="/finanzas" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaMoneyBillWave className="icon" /></div><span>Finanzas</span></Link></li>
                  <li><Link to="/auditorias" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaFileInvoice className="icon" /></div><span>Auditorías</span></Link></li>
                </ul>
              )}
            </li>

            <li>
              <Link to="/temples" className="sidebar-link" onClick={() => setIsMenuOpen(false)}>
                <div className="icon-circle">
                  <FaSynagogue className="icon" />
                </div>
                <span>Templo</span>
              </Link>
            </li>

            <li>
              <div className="sidebar-link" onClick={() => setIsMaintenanceOpen(!isMaintenanceOpen)} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><FaTools className="icon" /></div>
                <span>Mantenimiento</span>
                <FaChevronDown style={getChevronStyle(isMaintenanceOpen)} />
              </div>

              {isMaintenanceOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><Link to="/users" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><FaUser className="icon" /></div><span>Usuarios</span></Link></li>
                </ul>
              )}
            </li>

          </ul>
        </nav>

        <div className="logout-section">
          <button onClick={handleLogout} className="logout-button">
            <FaSignOutAlt className="logout-icon" />
            <span className="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;