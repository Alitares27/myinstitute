import { Link, useNavigate } from "react-router-dom";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaBookOpen,
  FaCalendarCheck,
  FaUser,
  FaStar, 
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

 const handleLogout = () => {
    sessionStorage.clear(); 
    navigate("/");
  };

  return (
    <div className="sidebar">
      <Link to="/dashboard" className="sidebar-logo">
        <span className="logo-icon">🎓</span>
        <span className="logo-text">Institute</span>
      </Link>

      <nav>
        <ul>
          <li>
            <Link to="/students" className="sidebar-link">
              <div className="icon-circle">
                <FaUserGraduate className="icon" />
              </div>
              <span>Estudiantes</span>
            </Link>
          </li>
          <li>
            <Link to="/teachers" className="sidebar-link">
              <div className="icon-circle">
                <FaChalkboardTeacher className="icon" />
              </div>
              <span>Maestros</span>
            </Link>
          </li>
          <li>
            <Link to="/enrollments" className="sidebar-link">
              <div className="icon-circle">
                <FaClipboardList className="icon" />
              </div>
              <span>Matrículas</span>
            </Link>
          </li>
          <li>
            <Link to="/courses" className="sidebar-link">
              <div className="icon-circle">
                <FaBookOpen className="icon" />
              </div>
              <span>Cursos</span>
            </Link>
          </li>
          <li>
            <Link to="/attendance" className="sidebar-link">
              <div className="icon-circle">
                <FaCalendarCheck className="icon" />
              </div>
              <span>Asistencia</span>
            </Link>
          </li>
          <li>
            <Link to="/users" className="sidebar-link">
              <div className="icon-circle">
                <FaUser className="icon" />
              </div>
              <span>Usuarios</span>
            </Link>
          </li>
          
          <li>
            <Link to="/grades" className="sidebar-link">
              <div className="icon-circle">
                <FaStar className="icon" />
              </div>
              <span>Calificaciones</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="logout-section">
        <button onClick={handleLogout} className="logout-button">
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default Sidebar;