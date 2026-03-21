import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Courses from "./pages/Courses";
import Enrollments from "./pages/Enrollments";
import Attendance from "./pages/Attendance";
import UserPage from "./pages/UserPage";
import Grades from "./pages/Grades";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/Layout";
import TempleDashboard from "./pages/Temples";
import TempleTrips from "./pages/TempleTrip";
import TempleAttendance from "./pages/TempleAttendance";
import Discursantes from "./pages/Discursantes";
import Consejos from "./pages/Consejos";
import Finanzas from "./pages/Finanzas";
import Auditorias from "./pages/Auditorias";


function App() {
  return (
    <BrowserRouter>
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
          path="/temples"
          element={
            <PrivateRoute>
              <Layout>
                <TempleDashboard />
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
          path="/consejos"
          element={
            <PrivateRoute>
              <Layout>
                <Consejos />
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

      </Routes>
    </BrowserRouter>
  );
}

export default App;