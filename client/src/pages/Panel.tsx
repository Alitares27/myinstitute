import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/Panel.css";
import { Skeleton } from "../components/Esqueleto";
import {
  TbSchool, TbUser, TbBooks, TbCalendar,
  TbBook, TbChartLine, TbStar, TbCircleCheck,
  TbBuilding, TbSettings, TbPencil,
  TbChartBar, TbRocket, TbAlertTriangle,
  TbCalendarCheck, TbRefresh
} from "react-icons/tb";

function Dashboard() {
  const [stats, setStats] = useState<any>({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
    completedActivities: 0,
    attendanceRate: "0%",
    averageGrade: 0,
  });

  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("No hay una sesión activa. Por favor, inicia sesión.");
      setLoading(false);
      return;
    }

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
            <div className="stats-grid desktop-statistics">
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
                    {Array.from({ length: 4 }).map((_, i) => (
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

  const renderAdminStats = () => (
    <div className="stats-grid desktop-statistics">
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
        <div className="stat-icon"><TbCalendarCheck /></div>
        <div className="stat-value">{stats.completedActivities}</div>
        <div className="stat-label">Actividades Completadas</div>
      </div>
    </div>
  );

  const renderTeacherStats = () => (
    <div className="stats-grid desktop-statistics">
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
    <div className="stats-grid desktop-statistics">
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

  const shortcuts = user?.role === "admin" ? [
    { to: "/consejos", title: "Consejos", description: "Gestionar consejos", Icon: TbCalendar },
    { to: "/reservar-viajes", title: "Templo", description: "Reservas y viajes", Icon: TbBuilding },
    { to: "/miembros", title: "Miembros", description: "Directorio de miembros", Icon: TbSettings },
  ] : user?.role === "teacher" ? [
    { to: "/asistencia", title: "Asistencia", description: "Registrar asistencia", Icon: TbPencil },
    { to: "/calificaciones", title: "Calificaciones", description: "Registrar notas", Icon: TbChartBar },
    { to: "/inscripciones", title: "Mis cursos", description: "Ver mis cursos", Icon: TbBooks },
  ] : [
    { to: "/inscripciones", title: "Mis cursos", description: "Ver mis clases", Icon: TbBook },
    { to: "/calificaciones", title: "Mis notas", description: "Consultar calificaciones", Icon: TbStar },
    { to: "/asistencia", title: "Mi asistencia", description: "Ver mi asistencia", Icon: TbCalendar },
  ];
  shortcuts.push({ to: "/sincronizacion", title: "Sincronizar", description: "Cambios pendientes", Icon: TbRefresh });

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <span className="role-badge">{user?.role}</span>
        <h1 className="dashboard-title">Hola, {user?.name}</h1>
        <p className="dashboard-subtitle">
          Bienvenido de nuevo. Aquí tienes un resumen de lo que está sucediendo en tu cuenta hoy.
        </p>
        {error && (
          <p className="error-message desktop-statistics" role="status">
            <TbAlertTriangle /> {error} Se muestra el panel sin estadísticas actualizadas.
          </p>
        )}
      </div>

      {user?.role === "admin" && renderAdminStats()}
      {user?.role === "teacher" && renderTeacherStats()}
      {user?.role === "student" && renderStudentStats()}

      <div className="shortcuts-section">
        <h2 className="section-title">
          <span><TbRocket /></span> Accesos Rápidos
        </h2>
        <div className="shortcuts-grid">
          {shortcuts.map(({ to, title, description, Icon }) => (
            <Link className="shortcut-card" key={to} to={to}>
              <span className="shortcut-icon-bg"><Icon aria-hidden="true" /></span>
              <div className="shortcut-info">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
