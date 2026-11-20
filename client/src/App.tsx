import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Inicio from "./pages/Inicio";
import IniciarSesion from "./pages/IniciarSesion";
import RutaPrivada from "./components/RutaPrivada";
import Disposicion from "./components/Disposicion";
import SessionMonitor from "./components/SessionMonitor";
import AppDialogHost from "./components/AppDialogHost";

const Agendas = lazy(() => import("./pages/Agendas"));
const Registrarse = lazy(() => import("./pages/Registrarse"));
const Consejos = lazy(() => import("./pages/Consejos"));
const NuevoConsejo = lazy(() => import("./pages/NuevoConsejo"));
const EditarConsejo = lazy(() => import("./pages/EditarConsejo"));
const DetallesConsejo = lazy(() => import("./components/meetings/DetallesConsejo"));

const Panel = lazy(() => import("./pages/Panel"));
const Miembros = lazy(() => import("./pages/Miembros"));
const Maestros = lazy(() => import("./pages/Maestros"));
const Inscripciones = lazy(() => import("./pages/Inscripciones"));
const Asistencia = lazy(() => import("./pages/Asistencia"));
const Calificaciones = lazy(() => import("./pages/Calificaciones"));
const ViajesTemplo = lazy(() => import("./pages/ViajesTemplo"));
const ReservarViajes = lazy(() => import("./pages/ReservarViajes"));
const Discursantes = lazy(() => import("./pages/Discursantes"));
const Actividades = lazy(() => import("./pages/Actividades"));
const NuevaActividad = lazy(() => import("./pages/NuevaActividad"));
const EditarActividad = lazy(() => import("./pages/EditarActividad"));
const Auditorias = lazy(() => import("./pages/Auditorias"));
const MantTemplos = lazy(() => import("./pages/MantTemplos"));
const PagosTemplos = lazy(() => import("./pages/PagosTemplos"));


const Ajustes = lazy(() => import("./pages/Ajustes"));

function App() {
  return (
    <BrowserRouter>
      <SessionMonitor />
      <AppDialogHost />
      <Suspense fallback={
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando pÃ¡gina...</p>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/iniciar-sesion" element={<IniciarSesion />} />
          <Route path="/registrarse" element={<><IniciarSesion /><Registrarse /></>} />

          <Route path="/panel" element={<RutaPrivada module="panel"><Disposicion><Panel /></Disposicion></RutaPrivada>} />
          <Route path="/miembros" element={<RutaPrivada module="miembros"><Disposicion><Miembros /></Disposicion></RutaPrivada>} />
          <Route path="/maestros" element={<RutaPrivada module="maestros"><Disposicion><Maestros /></Disposicion></RutaPrivada>} />
          <Route path="/inscripciones" element={<RutaPrivada module="inscripciones"><Disposicion><Inscripciones /></Disposicion></RutaPrivada>} />
          <Route path="/asistencia" element={<RutaPrivada module="asistencia"><Disposicion><Asistencia /></Disposicion></RutaPrivada>} />
          <Route path="/usuarios" element={<RutaPrivada module="miembros"><Navigate to="/miembros" replace /></RutaPrivada>} />
          <Route path="/calificaciones" element={<RutaPrivada module="calificaciones"><Disposicion><Calificaciones /></Disposicion></RutaPrivada>} />
          <Route path="/viajes-templo" element={<RutaPrivada module="viajes-templo"><Disposicion><ViajesTemplo /></Disposicion></RutaPrivada>} />
          <Route path="/reservar-viajes" element={<RutaPrivada module="reservar-viajes"><Disposicion><ReservarViajes /></Disposicion></RutaPrivada>} />
          <Route path="/agendas" element={<RutaPrivada module="agendas"><Disposicion><Agendas /></Disposicion></RutaPrivada>} />
          <Route path="/discursantes" element={<RutaPrivada module="discursantes"><Disposicion><Discursantes /></Disposicion></RutaPrivada>} />

          <Route path="/consejos" element={<RutaPrivada module="consejos"><Disposicion><Consejos key="editor-background" /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/nuevo" element={<RutaPrivada module="consejos" adminOnly><Disposicion><Consejos key="editor-background" /><NuevoConsejo /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/:id" element={<RutaPrivada module="consejos"><Disposicion><DetallesConsejo /></Disposicion></RutaPrivada>} />
          <Route path="/consejos/editar/:id" element={<RutaPrivada module="consejos" adminOnly><Disposicion><Consejos key="editor-background" /><EditarConsejo /></Disposicion></RutaPrivada>} />

          <Route path="/actividades" element={<RutaPrivada module="actividades"><Disposicion><Actividades /></Disposicion></RutaPrivada>} />
          <Route path="/actividades/nueva" element={<RutaPrivada module="actividades"><Disposicion><Actividades key="editor-background" /><NuevaActividad /></Disposicion></RutaPrivada>} />
          <Route path="/actividades/editar/:id" element={<RutaPrivada module="actividades" adminOnly><Disposicion><Actividades key="editor-background" /><EditarActividad /></Disposicion></RutaPrivada>} />

          <Route path="/auditorias" element={<RutaPrivada module="auditorias"><Disposicion><Auditorias /></Disposicion></RutaPrivada>} />
          <Route path="/templos" element={<RutaPrivada module="templos"><Disposicion><MantTemplos /></Disposicion></RutaPrivada>} />
          <Route path="/ajustes" element={<RutaPrivada><Disposicion><Ajustes /></Disposicion></RutaPrivada>} />
          <Route path="/sincronizacion" element={<RutaPrivada module="sincronizacion"><Navigate to="/ajustes#sincronizacion" replace /></RutaPrivada>} />
          <Route path="/notificaciones" element={<RutaPrivada adminOnly><Navigate to="/ajustes#notificaciones" replace /></RutaPrivada>} />
          <Route path="/pagos" element={<RutaPrivada module="pagos-templos"><Disposicion><PagosTemplos /></Disposicion></RutaPrivada>} />

          <Route path="/sin-acceso" element={<RutaPrivada><Disposicion><p role="status">Tu cuenta no tiene páginas habilitadas. Pide a un administrador que revise tus permisos.</p></Disposicion></RutaPrivada>} />
          <Route path="*" element={
            <RutaPrivada>
              <Disposicion>
                <div className="page-container" style={{ textAlign: "center", paddingTop: "4rem" }}>
                  <h1>404</h1>
                  <p style={{ color: "var(--text-secondary)" }}>PÃ¡gina no encontrada</p>
                </div>
              </Disposicion>
            </RutaPrivada>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
