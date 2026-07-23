import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";
import Meetings from "./pages/Meetings";
import NewMeeting from "./pages/NewMeeting";
import EditMeeting from "./pages/EditMeeting";
import MeetingDetails from "./components/meetings/MeetingDetails";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Courses = lazy(() => import("./pages/Courses"));
const Enrollments = lazy(() => import("./pages/Enrollments"));
const Attendance = lazy(() => import("./pages/Attendance"));
const UserPage = lazy(() => import("./pages/UserPage"));
const Grades = lazy(() => import("./pages/Grades"));
const TempleTrips = lazy(() => import("./pages/TempleTrip"));
const TempleAttendance = lazy(() => import("./pages/TempleAttendance"));
const Discursantes = lazy(() => import("./pages/Discursantes"));
const Finanzas = lazy(() => import("./pages/Finanzas"));
const Auditorias = lazy(() => import("./pages/Auditorias"));
const TemasManagement = lazy(() => import("./pages/TemasManagement"));
const TemplosMaintenance = lazy(() => import("./pages/TemplosMaintenance"));


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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />


          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students"
            element={
              <PrivateRoute>
                <Layout>
                  <Students />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <PrivateRoute>
                <Layout>
                  <Teachers />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <PrivateRoute>
                <Layout>
                  <Courses />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/enrollments"
            element={
              <PrivateRoute>
                <Layout>
                  <Enrollments />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <PrivateRoute>
                <Layout>
                  <Attendance />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute>
                <Layout>
                  <UserPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/grades"
            element={
              <PrivateRoute>
                <Layout>
                  <Grades />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/templeTrip"
            element={
              <PrivateRoute>
                <Layout>
                  <TempleTrips />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/templeAttendance"
            element={
              <PrivateRoute>
                <Layout>
                  <TempleAttendance />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/discursantes"
            element={
              <PrivateRoute>
                <Layout>
                  <Discursantes />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <PrivateRoute>
                <Layout>
                  <Meetings />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/meetings/new"
            element={
              <PrivateRoute>
                <Layout>
                  <NewMeeting />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/meetings/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <MeetingDetails />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/meetings/edit/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <EditMeeting />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/finanzas"
            element={
              <PrivateRoute>
                <Layout>
                  <Finanzas />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/auditorias"
            element={
              <PrivateRoute>
                <Layout>
                  <Auditorias />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/temas-management"
            element={
              <PrivateRoute>
                <Layout>
                  <TemasManagement />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/templos-management"
            element={
              <PrivateRoute>
                <Layout>
                  <TemplosMaintenance />
                </Layout>
              </PrivateRoute>
            }
          />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;