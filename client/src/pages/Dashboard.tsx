import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
    attendanceRate: "0%",
  });

  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setError("No hay una sesión activa. Por favor, inicia sesión.");
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

    axios
      .get(`${API_BASE_URL}/users/me`, config)
      .then((res) => setUser(res.data))
      .catch(() => setError("Error al obtener datos del perfil"));

    axios
      .get(`${API_BASE_URL}/dashboard-stats`, config)
      .then((res) => setStats(res.data))
      .catch((err) =>
        console.error("Error cargando estadísticas:", err)
      );
  }, [API_BASE_URL]);

  if (error) {
    return (
      <div className="error-container">
        <p style={{ color: "red", padding: "20px" }}>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">
        👋 Bienvenid@, {user?.name}
      </h1>

      {user && (
        <p className="dashboard-subtitle">
          Has iniciado sesión como <strong>{user.role}</strong>.
        </p>
      )}

      <p className="dashboard-subtitle">
        Aquí encontrarás un resumen general y accesos rápidos del sistema.
      </p>

      <div className="cards">
        <div
          className="card clickable"
          onClick={() => navigate("/students")}
        >
          <div className="card-icon">🎓</div>
          <h2>Estudiantes</h2>
          <p>{stats.students}</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/teachers")}
        >
          <div className="card-icon">👩‍🏫</div>
          <h2>Maestros</h2>
          <p>{stats.teachers}</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/courses")}
        >
          <div className="card-icon">📚</div>
          <h2>Cursos</h2>
          <p>{stats.courses}</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/enrollments")}
        >
          <div className="card-icon">📝</div>
          <h2>Matrículas</h2>
          <p>{stats.enrollments}</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/attendance")}
        >
          <div className="card-icon">📅</div>
          <h2>Asistencia</h2>
          <p>{stats.attendanceRate}</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/grades")}
        >
          <div className="card-icon">📊</div>
          <h2>Calificaciones</h2>
          <p>Ver reportes</p>
        </div>

        <div
          className="card clickable"
          onClick={() => navigate("/users")}
        >
          <div className="card-icon">👤</div>
          <h2>Mi Perfil</h2>
          <p>Configuración</p>
        </div>

        {user?.role === "admin" && (
          <div
            className="card clickable"
            onClick={() => navigate("/users")}
          >
            <div className="card-icon">⚙️</div>
            <h2>Usuarios</h2>
            <p>Administración</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
