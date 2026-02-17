import { useNavigate } from "react-router-dom";

export default function Temples() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <h1 
  className="dashboard-subtitle" 
  style={{ 
    fontSize: '3.5rem', 
    textAlign: 'center', 
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px' 
  }}
>
  <img 
    src="/temple.webp" 
    alt="Icono Templo" 
    style={{ 
      width: '80px',  
      height: '80px', 
      objectFit: 'cover',
      borderRadius: '8px' 
    }} 
  />
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
