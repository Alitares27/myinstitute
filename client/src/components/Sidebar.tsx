import { Link, useNavigate } from "react-router-dom";
import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaClipboardList,
  FaBookOpen,
  FaCalendarCheck,
  FaUser,
} from "react-icons/fa";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <Link to="/dashboard" className="sidebar-logo">
        <span className="logo-icon">🎓</span>
        <span className="logo-text">MyInstitute</span>
      </Link>

      <nav>
        <ul>
          <li>
            <Link to="/students" className="sidebar-link">
              <div className="icon-circle">
                <FaUserGraduate className="icon" />
              </div>
              <span>Students</span>
            </Link>
          </li>
          <li>
            <Link to="/teachers" className="sidebar-link">
              <div className="icon-circle">
                <FaChalkboardTeacher className="icon" />
              </div>
              <span>Teachers</span>
            </Link>
          </li>
          <li>
            <Link to="/enrollments" className="sidebar-link">
              <div className="icon-circle">
                <FaClipboardList className="icon" />
              </div>
              <span>Enrollments</span>
            </Link>
          </li>
          <li>
            <Link to="/courses" className="sidebar-link">
              <div className="icon-circle">
                <FaBookOpen className="icon" />
              </div>
              <span>Courses</span>
            </Link>
          </li>
          <li>
            <Link to="/attendance" className="sidebar-link">
              <div className="icon-circle">
                <FaCalendarCheck className="icon" />
              </div>
              <span>Attendance</span>
            </Link>
          </li>
          <li>
            <Link to="/users" className="sidebar-link">
              <div className="icon-circle">
                <FaUser className="icon" />
              </div>
              <span>Users</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="logout-section">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;