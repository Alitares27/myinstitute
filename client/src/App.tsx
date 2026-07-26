import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio";
import Registrarse from "./pages/Registrarse";
import IniciarSesion from "./pages/IniciarSesion";
import RutaPrivada from "./components/RutaPrivada";
import Disposicion from "./components/Disposicion";
import Consejos from "./pages/Consejos";
import NuevoConsejo from "./pages/NuevoConsejo";
import EditarConsejo from "./pages/EditarConsejo";
import DetallesConsejo from "./components/meetings/DetallesConsejo";

const Panel = lazy(() => import("./pages/Panel"));
const Miembros = lazy(() => import("./pages/Miembros"));
const Inscripciones = lazy(() => import("./pages/Inscripciones"));
const Asistencia = lazy(() => import("./pages/Asistencia"));
const PaginaUsuario = lazy(() => import("./pages/PaginaUsuario"));
const Calificaciones = lazy(() => import("./pages/Calificaciones"));
const ViajesTemplo = lazy(() => import("./pages/ViajesTemplo"));
const ReservarViajes = lazy(() => import("./pages/ReservarViajes"));
const Discursantes = lazy(() => import("./pages/Discursantes"));
const Actividades = lazy(() => import("./pages/Actividades"));
const NuevaActividad = lazy(() => import("./pages/NuevaActividad"));
const EditarActividad = lazy(() => import("./pages/EditarActividad"));
const Auditorias = lazy(() => import("./pages/Auditorias"));
const MantTemplos = lazy(() => import("./pages/MantTemplos"));


function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando página...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/iniciar-sesion" element={<IniciarSesion />} />
          <Route path="/registrarse" element={<Registrarse />} />

          <Route path="/panel" element={<RutaPrivada><Disposicion><Panel /></Disposicion></RutaPrivada>} />
          <Route path="/miembros" element={<RutaPrivada><Disposicion><Miembros /></Disposicion></RutaPrivada>} />
          <Route path="/inscripciones" element={<RutaPrivada><Disposicion><Inscripciones /></Disposicion></RutaPrivada>} />
          <Route path="/asistencia" element={<RutaPrivada><Disposicion><Asistencia /></Disposicion></RutaPrivada>} />
          <Route path="/usuarios" element={<RutaPrivada><Disposicion><PaginaUsuario /></Disposicion></RutaPrivada>} />
          <Route path="/calificaciones" element={<RutaPrivada><Disposicion><Calificaciones /></Disposicion></RutaPrivada>} />
          <Route path="/viajes-templo" element={<RutaPrivada><Disposicion><ViajesTemplo /></Disposicion></RutaPrivada>} />
          <Route path="/reservar-viajes" element={<RutaPrivada><Disposicion><ReservarViajes /></Disposicion></RutaPrivada>} />
          <Route path="/discursantes" element={<RutaPrivada><Disposicion><Discursantes /></Disposicion></RutaPrivada>} />

          <Route path="/consejos" element={<RutaPrivada><Disposicion><Consejos /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/nuevo" element={<RutaPrivada><Disposicion><NuevoConsejo /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/:id" element={<RutaPrivada><Disposicion><DetallesConsejo /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/editar/:id" element={<RutaPrivada><Disposicion><EditarConsejo /></Disposicion></RutaPrivada>} />

          <Route path="/actividades" element={<RutaPrivada><Disposicion><Actividades /></Disposicion></RutaPrivada>} />
          <Route path="/actividades/nueva" element={<RutaPrivada><Disposicion><NuevaActividad /></Disposicion></RutaPrivada>} />
          <Route path="/actividades/editar/:id" element={<RutaPrivada><Disposicion><EditarActividad /></Disposicion></RutaPrivada>} />

          <Route path="/auditorias" element={<RutaPrivada><Disposicion><Auditorias /></Disposicion></RutaPrivada>} />
          <Route path="/templos" element={<RutaPrivada><Disposicion><MantTemplos /></Disposicion></RutaPrivada>} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
