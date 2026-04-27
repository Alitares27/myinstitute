import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
    attendanceRate: "0%",
    averageGrade: 0,
  });

  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setError("No hay una sesión activa. Por favor, inicia sesión.");
      setLoading(false);
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    const sessionUser = sessionStorage.getItem("user");
    if (sessionUser) setUser(JSON.parse(sessionUser));

    axios
      .get(`${API_BASE_URL}/dashboard-stats`, config)
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando estadísticas:", err);
        setError("Error al cargar las estadísticas. Reintente más tarde.");
        setLoading(false);
      });
  }, [API_BASE_URL]);

  if (loading) {
    return <div className="loading-container">Cargando dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="extracted-style-29">⚠️ {error}</p>
        <button onClick={() => navigate("/login")} className="btn primary">Ir al Login</button>
      </div>
    );
  }

  const renderAdminStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">🎓</div>
        <div className="stat-value">{stats.students}</div>
        <div className="stat-label">Estudiantes</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">👩‍🏫</div>
        <div className="stat-value">{stats.teachers}</div>
        <div className="stat-label">Maestros</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📚</div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Cursos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📅</div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Asistencia General</div>
      </div>
    </div>
  );

  const renderTeacherStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">👨‍🎓</div>
        <div className="stat-value">{stats.students}</div>
        <div className="stat-label">Mis Estudiantes</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📖</div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Mis Cursos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📈</div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Asistencia Promedio</div>
      </div>
    </div>
  );

  const renderStudentStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📘</div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Cursos Inscritos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">⭐</div>
        <div className="stat-value">{stats.averageGrade}</div>
        <div className="stat-label">Promedio General</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">✅</div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Mi Asistencia</div>
      </div>
    </div>
  );

  const renderShortcuts = () => {
    if (user?.role === "admin") {
      return (
        <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate("/discursantes")}>
            <div className="shortcut-icon-bg">🎤</div>
            <div className="shortcut-info">
              <h3>Discursantes</h3>
              <p>Gestionar oradores y discursos</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/templeAttendance")}>
            <div className="shortcut-icon-bg">🏛️</div>
            <div className="shortcut-info">
              <h3>Templo</h3>
              <p>Reservas y viajes al templo</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/users")}>
            <div className="shortcut-icon-bg">⚙️</div>
            <div className="shortcut-info">
              <h3>Usuarios</h3>
              <p>Control de acceso al sistema</p>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === "teacher") {
      return (
        <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate("/attendance")}>
            <div className="shortcut-icon-bg">📝</div>
            <div className="shortcut-info">
              <h3>Tomar Asistencia</h3>
              <p>Registrar alumnos presentes hoy</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/grades")}>
            <div className="shortcut-icon-bg">📊</div>
            <div className="shortcut-info">
              <h3>Calificaciones</h3>
              <p>Subir y editar notas</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/courses")}>
            <div className="shortcut-icon-bg">📚</div>
            <div className="shortcut-info">
              <h3>Ver mis Cursos</h3>
              <p>Detalle de mis materias</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/students")}>
            <div className="shortcut-icon-bg">👤</div>
            <div className="shortcut-info">
              <h3>Lista de Alumnos</h3>
              <p>Consultar estudiantes asignados</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="shortcuts-grid">
        <div className="shortcut-card" onClick={() => navigate("/courses")}>
          <div className="shortcut-icon-bg">📖</div>
          <div className="shortcut-info">
            <h3>Mis Cursos</h3>
            <p>Ver mis clases y horarios</p>
          </div>
        </div>
        <div className="shortcut-card" onClick={() => navigate("/grades")}>
          <div className="shortcut-icon-bg">⭐</div>
          <div className="shortcut-info">
            <h3>Mis Notas</h3>
            <p>Reporte de calificaciones</p>
          </div>
        </div>
        <div className="shortcut-card" onClick={() => navigate("/attendance")}>
          <div className="shortcut-icon-bg">📅</div>
          <div className="shortcut-info">
            <h3>Mi Asistencia</h3>
            <p>Resumen de faltas y presencia</p>
          </div>
        </div>
        <div className="shortcut-card" onClick={() => navigate("/users")}>
          <div className="shortcut-icon-bg">👤</div>
          <div className="shortcut-info">
            <h3>Mi Perfil</h3>
            <p>Datos personales y configuración</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <span className="role-badge">{user?.role}</span>
        <h1 className="dashboard-title">Hola, {user?.name}</h1>
        <p className="dashboard-subtitle">
          Bienvenido de nuevo. Aquí tienes un resumen de lo que está sucediendo en tu cuenta hoy.
        </p>
      </div>

      {user?.role === "admin" && renderAdminStats()}
      {user?.role === "teacher" && renderTeacherStats()}
      {user?.role === "student" && renderStudentStats()}

      <div className="shortcuts-section">
        <h2 className="section-title">
          <span>🚀</span> Accesos Rápidos
        </h2>
        {renderShortcuts()}
      </div>
    </div>
  );
}

export default Dashboard;
