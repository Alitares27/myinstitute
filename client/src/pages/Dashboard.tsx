import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    courses: 0,
    enrollments: 0,
    attendanceRate: "0%",
  });
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
     
      .catch(() => setError("Error cargando usuario"));

    axios
      .get("http://localhost:5000/api/dashboard-stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStats(res.data))
      .catch(() => setError("Error cargando estadísticas"));
  }, []);

  if (error) {
    return (
      <Layout>
        <p>{error}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-page">
        {/* Bienvenida personalizada */}
        <h1 className="dashboard-title">
          👋 Bienvenido, {user?.name || "Usuario"} 
        </h1>

        {user && (
          <p className="dashboard-subtitle">
            Has iniciado sesión como <strong>{user.role}</strong>.
          </p>
        )}

        <p className="dashboard-subtitle">
          Aquí encontrarás un resumen de la actividad y estadísticas más relevantes.
        </p>

        {/* Tarjetas de estadísticas */}
        <div className="cards">
          <div className="card">
            <h2>Estudiantes</h2>
            <p>{stats.students}</p>
          </div>
          <div className="card">
            <h2>Maestros</h2>
            <p>{stats.teachers}</p>
          </div>
          <div className="card">
            <h2>Cursos</h2>
            <p>{stats.courses}</p>
          </div>
          <div className="card">
            <h2>Matriculas</h2>
            <p>{stats.enrollments}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;