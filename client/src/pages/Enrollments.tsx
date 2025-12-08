import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout"; 

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", student_id: "", course_id: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/me", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        setRole(res.data.role); 
        setUserId(res.data.id);
      });

    axios
      .get("http://localhost:5000/api/enrollments", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setEnrollments(res.data));

    axios
      .get("http://localhost:5000/api/students", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setStudents(res.data));

    axios
      .get("http://localhost:5000/api/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCourses(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.id) {
      const res = await axios.put(
        `http://localhost:5000/api/enrollments/${form.id}`,
        { student_id: form.student_id, course_id: form.course_id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setEnrollments(enrollments.map((en) => (en.id === form.id ? res.data : en)));
    } else {
      const res = await axios.post("http://localhost:5000/api/enrollments", form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setEnrollments([...enrollments, res.data]);
    }

    setForm({ id: "", student_id: "", course_id: "" });
  };

  const handleEdit = (enrollment: any) => {
    setForm({
      id: enrollment.id,
      student_id: enrollment.student_id,
      course_id: enrollment.course_id,
    });
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`http://localhost:5000/api/enrollments/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setEnrollments(enrollments.filter((en) => en.id !== id));
  };

  const filteredEnrollments =
    role === "student"
      ? enrollments.filter((en) => en.student_id === userId)
      : enrollments;

  return (
    <Layout>
      <div className="enrollments-page">
        <h2>📝 Matrículas</h2>

        {role === "admin" && (
          <form onSubmit={handleSubmit} className="enrollment-form">
            <select
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            >
              <option value="">Elegir Estudiante</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              <option value="">Elegir Curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <button type="submit">
              {form.id ? "Actualizar Matrícula" : "Matricular"}
            </button>
          </form>
        )}

        {role === "admin" ? (
          <table className="enrollments-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Curso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((en) => (
                <tr key={en.id}>
                  <td>
                    {students.find((s) => s.id === en.student_id)?.name ||
                      en.student_id}
                  </td>
                  <td>
                    {courses.find((c) => c.id === en.course_id)?.title ||
                      en.course_id}
                  </td>
                  <td>
                    <button onClick={() => handleEdit(en)}>Edit</button>
                    <button onClick={() => handleDelete(en.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>
            <h3>Mis Matrículas</h3>
            <ul className="enrollment-report">
              {filteredEnrollments.map((en) => (
                <li key={en.id}>
                  {courses.find((c) => c.id === en.course_id)?.title ||
                    en.course_id}
                </li>
              ))}
            </ul>

            <form onSubmit={handleSubmit} className="enrollment-form">
              <select
                value={form.course_id}
                onChange={(e) =>
                  setForm({ ...form, student_id: userId, course_id: e.target.value })
                }
              >
                <option value="">Elegir Curso</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <button type="submit">Matricularme</button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}