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
      </Routes>
    </BrowserRouter>
  );
}

export default App;