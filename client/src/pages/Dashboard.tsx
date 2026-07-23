import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Dashboard.css";
import { Skeleton } from "../components/Skeleton";
import {
  TbSchool, TbUser, TbBooks, TbCalendar,
  TbBook, TbChartLine, TbStar, TbCircleCheck,
  TbBuilding, TbSettings, TbPencil,
  TbChartBar, TbRocket, TbAlertTriangle
} from "react-icons/tb";

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

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setError("No hay una sesión activa. Por favor, inicia sesión.");
      setLoading(false);
      return;
    }

    const sessionUser = sessionStorage.getItem("user");
    if (sessionUser) setUser(JSON.parse(sessionUser));

    api
      .get("/dashboard-stats")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar las estadísticas. Reintente más tarde.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <Skeleton width="80px" height="1.2rem" />
                <Skeleton width="240px" height="2rem" style={{ marginTop: "8px" }} />
                <Skeleton width="400px" height="0.9rem" style={{ marginTop: "8px" }} />
            </div>
            <div className="stats-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "1.5rem" }}>
                        <Skeleton width="40px" height="40px" style={{ borderRadius: "50%" }} />
                        <Skeleton width="60px" height="1.5rem" />
                        <Skeleton width="80px" height="0.8rem" />
                    </div>
                ))}
            </div>
            <div className="shortcuts-section">
                <Skeleton width="180px" height="1.5rem" style={{ marginBottom: "16px" }} />
                <div className="shortcuts-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="shortcut-card" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "1rem" }}>
                            <Skeleton width="48px" height="48px" style={{ borderRadius: "12px", flexShrink: 0 }} />
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                                <Skeleton width="100px" height="1rem" />
                                <Skeleton width="160px" height="0.75rem" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="error-container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="extracted-style-29"><TbAlertTriangle /> {error}</p>
        <button onClick={() => navigate("/login")} className="btn primary">Ir al Login</button>
      </div>
    );
  }

  const renderAdminStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon"><TbSchool /></div>
        <div className="stat-value">{stats.students}</div>
        <div className="stat-label">Miembros</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbUser /></div>
        <div className="stat-value">{stats.teachers}</div>
        <div className="stat-label">Maestros</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbBooks /></div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Cursos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbCalendar /></div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Asistencia General</div>
      </div>
    </div>
  );

  const renderTeacherStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon"><TbSchool /></div>
        <div className="stat-value">{stats.students}</div>
        <div className="stat-label">Mis Estudiantes</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbBook /></div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Mis Cursos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbChartLine /></div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Asistencia Promedio</div>
      </div>
    </div>
  );

  const renderStudentStats = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon"><TbBook /></div>
        <div className="stat-value">{stats.courses}</div>
        <div className="stat-label">Cursos Inscritos</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbStar /></div>
        <div className="stat-value">{stats.averageGrade}</div>
        <div className="stat-label">Promedio General</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon"><TbCircleCheck /></div>
        <div className="stat-value">{stats.attendanceRate}</div>
        <div className="stat-label">Mi Asistencia</div>
      </div>
    </div>
  );

  const renderShortcuts = () => {
    if (user?.role === "admin") {
      return (
        <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate("/meetings")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/meetings")}>
            <div className="shortcut-icon-bg"><TbCalendar /></div>
            <div className="shortcut-info">
              <h3>Consejos</h3>
              <p>Programar y gestionar consejos</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/templeAttendance")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/templeAttendance")}>
            <div className="shortcut-icon-bg"><TbBuilding /></div>
            <div className="shortcut-info">
              <h3>Templo</h3>
              <p>Reservas y viajes al templo</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/users")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/users")}>
            <div className="shortcut-icon-bg"><TbSettings /></div>
            <div className="shortcut-info">
              <h3>Miembros</h3>
              <p>Control de acceso al sistema</p>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === "teacher") {
      return (
        <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate("/attendance")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/attendance")}>
            <div className="shortcut-icon-bg"><TbPencil /></div>
            <div className="shortcut-info">
              <h3>Tomar Asistencia</h3>
              <p>Registrar alumnos presentes hoy</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/grades")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/grades")}>
            <div className="shortcut-icon-bg"><TbChartBar /></div>
            <div className="shortcut-info">
              <h3>Calificaciones</h3>
              <p>Registrar calificaciones</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/courses")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/courses")}>
            <div className="shortcut-icon-bg"><TbBooks /></div>
            <div className="shortcut-info">
              <h3>Ver mis Cursos</h3>
              <p>Detalle de mis materias</p>
            </div>
          </div>
          <div className="shortcut-card" onClick={() => navigate("/students")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/students")}>
            <div className="shortcut-icon-bg"><TbUser /></div>
            <div className="shortcut-info">
              <h3>Lista de Miembros</h3>
              <p>Consultar miembros asignados</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="shortcuts-grid">
          <div className="shortcut-card" onClick={() => navigate("/courses")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/courses")}>
            <div className="shortcut-icon-bg"><TbBook /></div>
            <div className="shortcut-info">
              <h3>Mis Cursos</h3>
            <p>Ver mis clases y horarios</p>
          </div>
        </div>
        <div className="shortcut-card" onClick={() => navigate("/grades")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/grades")}>
            <div className="shortcut-icon-bg"><TbStar /></div>
          <div className="shortcut-info">
            <h3>Mis Notas</h3>
            <p>Reporte de calificaciones</p>
          </div>
        </div>
          <div className="shortcut-card" onClick={() => navigate("/attendance")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/attendance")}>
            <div className="shortcut-icon-bg"><TbCalendar /></div>
          <div className="shortcut-info">
            <h3>Mi Asistencia</h3>
            <p>Resumen de faltas y presencia</p>
          </div>
        </div>
        <div className="shortcut-card" onClick={() => navigate("/users")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/users")}>
            <div className="shortcut-icon-bg"><TbUser /></div>
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
          <span><TbRocket /></span> Accesos Rápidos
        </h2>
        {renderShortcuts()}
      </div>
    </div>
  );
}

export default Dashboard;
