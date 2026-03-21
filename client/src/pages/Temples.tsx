import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Temples() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = sessionStorage.getItem("role");

    if (!role || role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  return (
    <div className="dashboard-container">
      <h1
        className="dashboard-subtitle extracted-style-27"
      >
        Templo
      </h1>

      <div className="cards">
        <div
          className="card clickable-card"
          onClick={() => window.open("https://www.familysearch.org/es/global")}
        >
          <div className="card-icon">🌳</div>
          <h2>FamilySearch</h2>
          <p>Revisar Arbol Familiar</p>
        </div>

        <div
          className="card clickable-card"
          onClick={() => navigate("/templeTrip")}
        >
          <div className="card-icon">🚌</div>
          <h2>Viajes</h2>
          <p>Programar</p>
        </div>

        <div
          className="card clickable-card"
          onClick={() => navigate("/templeAttendance")}
        >
          <div className="card-icon">📅</div>
          <h2>Asistencia</h2>
          <p>Control</p>
        </div>
      </div>
    </div>
  );
}
