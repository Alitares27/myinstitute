import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import { useTheme } from "../context/ThemeContext";
import {
  IoSchoolOutline,
  IoPersonOutline,
  IoClipboardOutline,
  IoCalendarOutline,
  IoRibbonOutline,
  IoBriefcaseOutline,
  IoMicOutline,
  IoPeopleOutline,
  IoWalletOutline,
  IoDocumentTextOutline,
  IoBusinessOutline,
  IoSettingsOutline,
  IoBookOutline,
  IoChevronDown,
  IoLogOutOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoMoonOutline,
  IoSunnyOutline
} from "react-icons/io5";

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const role = user.role || "";

  const isTeachingActive = ["/students", "/enrollments", "/attendance", "/grades"].includes(currentPath);
  const isLeadershipActive = ["/discursantes", "/meetings", "/finanzas", "/auditorias"].includes(currentPath);
  const isTempleActive = ["/templeTrip", "/templeAttendance"].includes(currentPath);
  const isMaintenanceActive = ["/users", "/teachers", "/courses", "/temas-management", "/templos-management"].includes(currentPath);

  const [isTeachingOpen, setIsTeachingOpen] = useState(isTeachingActive);
  const [isLeadershipOpen, setIsLeadershipOpen] = useState(isLeadershipActive);
  const [isTempleOpen, setIsTempleOpen] = useState(isTempleActive);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(isMaintenanceActive);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isTeachingActive) setIsTeachingOpen(true);
    if (isLeadershipActive) setIsLeadershipOpen(true);
    if (isTempleActive) setIsTempleOpen(true);
    if (isMaintenanceActive) setIsMaintenanceOpen(true);
  }, [currentPath, isTeachingActive, isLeadershipActive, isTempleActive, isMaintenanceActive]);

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
            src="/temple.webp"
            alt="Logo"
            className="logo-icon"
            style={{ width: "40px", height: "40px", objectFit: "contain" }}
          />
          <span className="logo-text">GestionAR</span>
        </Link>
        <div className="sidebar-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
            {theme === "light" ? <IoMoonOutline /> : <IoSunnyOutline />}
          </button>
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <IoCloseOutline /> : <IoMenuOutline />}
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <nav>
          <ul>
            <li>
              <button type="button" className={`sidebar-link button-link ${isTeachingActive ? "parent-active" : ""}`} onClick={() => setIsTeachingOpen(!isTeachingOpen)} aria-expanded={isTeachingOpen} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><IoSchoolOutline className="icon" /></div>
                <span>Enseñanza</span>
                <IoChevronDown style={getChevronStyle(isTeachingOpen)} />
              </button>

              {isTeachingOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><NavLink to="/students" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoPersonOutline className="icon" /></div><span>Miembros</span></NavLink></li>
                  <li><NavLink to="/enrollments" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoClipboardOutline className="icon" /></div><span>Matrículas</span></NavLink></li>
                  <li><NavLink to="/attendance" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoCalendarOutline className="icon" /></div><span>Asistencia</span></NavLink></li>
                  <li><NavLink to="/grades" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoRibbonOutline className="icon" /></div><span>Calificaciones</span></NavLink></li>
                </ul>
              )}
            </li>

            <li>
              <button type="button" className={`sidebar-link button-link ${isLeadershipActive ? "parent-active" : ""}`} onClick={() => setIsLeadershipOpen(!isLeadershipOpen)} aria-expanded={isLeadershipOpen} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><IoBriefcaseOutline className="icon" /></div>
                <span>Liderazgo</span>
                <IoChevronDown style={getChevronStyle(isLeadershipOpen)} />
              </button>

              {isLeadershipOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><NavLink to="/discursantes" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoMicOutline className="icon" /></div><span>Discursantes</span></NavLink></li>
                  <li>
                    <NavLink to="/meetings" className="sidebar-link" onClick={() => setIsMenuOpen(false)}>
                      <div className="icon-circle">
                        <IoPeopleOutline className="icon" />
                      </div>

                      <span>Consejos</span>
                    </NavLink>
                  </li>
                  <li><NavLink to="/finanzas" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoWalletOutline className="icon" /></div><span>Finanzas</span></NavLink></li>
                  <li><NavLink to="/auditorias" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoDocumentTextOutline className="icon" /></div><span>Auditorías</span></NavLink></li>
                </ul>
              )}
            </li>

            <li>
              <button type="button" className={`sidebar-link button-link ${isTempleActive ? "parent-active" : ""}`} onClick={() => setIsTempleOpen(!isTempleOpen)} aria-expanded={isTempleOpen} style={{ cursor: "pointer" }}>
                <div className="icon-circle"><IoBusinessOutline className="icon" /></div>
                <span>Templo</span>
                <IoChevronDown style={getChevronStyle(isTempleOpen)} />
              </button>

              {isTempleOpen && (
                <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                  <li><NavLink to="/templeTrip" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoCalendarOutline className="icon" /></div><span>Viajes</span></NavLink></li>
                  <li><NavLink to="/templeAttendance" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoPeopleOutline className="icon" /></div><span>Reservas</span></NavLink></li>
                </ul>
              )}
            </li>

            {role === "admin" && (
              <li>
                <button type="button" className={`sidebar-link button-link ${isMaintenanceActive ? "parent-active" : ""}`} onClick={() => setIsMaintenanceOpen(!isMaintenanceOpen)} aria-expanded={isMaintenanceOpen} style={{ cursor: "pointer" }}>
                  <div className="icon-circle"><IoSettingsOutline className="icon" /></div>
                  <span>Mantenimiento</span>
                  <IoChevronDown style={getChevronStyle(isMaintenanceOpen)} />
                </button>

                {isMaintenanceOpen && (
                  <ul className="submenu" style={{ paddingLeft: "20px", listStyle: "none" }}>
                    <li><NavLink to="/users" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoPersonOutline className="icon" /></div><span>Miembros</span></NavLink></li>
                    <li><NavLink to="/teachers" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoSchoolOutline className="icon" /></div><span>Maestros</span></NavLink></li>
                    <li><NavLink to="/courses" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoBookOutline className="icon" /></div><span>Cursos</span></NavLink></li>
                    <li><NavLink to="/temas-management" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoMicOutline className="icon" /></div><span>Temas</span></NavLink></li>
                    <li><NavLink to="/templos-management" className="sidebar-link" onClick={() => setIsMenuOpen(false)}><div className="icon-circle"><IoBusinessOutline className="icon" /></div><span>Templos</span></NavLink></li>
                  </ul>
                )}
              </li>
            )}

          </ul>
        </nav>

        <div className="logout-section">
          <button onClick={handleLogout} className="logout-button">
            <IoLogOutOutline className="logout-icon" />
            <span className="logout-text">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;