import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", name: "", grade: "" });
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
      .get("http://localhost:5000/api/students", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setStudents(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.id) {
      const res = await axios.put(
        `http://localhost:5000/api/students/${form.id}`,
        { name: form.name, grade: form.grade },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setStudents(students.map((s) => (s.id === form.id ? res.data : s)));
    } else {
      const res = await axios.post("http://localhost:5000/api/students", form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setStudents([...students, res.data]);
    }

    setForm({ id: "", name: "", grade: "" });
  };

  const handleEdit = (student: any) => {
    setForm({ id: student.id, name: student.name, grade: student.grade });
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`http://localhost:5000/api/students/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setStudents(students.filter((s) => s.id !== id));
  };

  const filteredStudents =
    role === "student"
      ? students.filter((s) => s.id === userId)
      : students;

  return (
    <Layout>
      <div className="students-page">
        <h2>👨‍🎓 Estudiantes</h2>

        {role === "admin" && (
          <form onSubmit={handleSubmit} className="student-form">
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Grado"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
            <button type="submit">
              {form.id ? "Actualizar Estudiante" : "Agregar Estudiante"}
            </button>
          </form>
        )}

        {role === "admin" ? (
          <table className="students-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Organización</th>
              </tr>
            </thead>

            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.telefono}</td>
                  <td>{s.grade}</td>
                </tr>
              ))}

            </tbody>
          </table>
        ) : (
          filteredStudents.map((s) => (
            <div key={s.id} className="student-info">
              <p><strong>Nombre:</strong> {s.name}</p>
              <p><strong>Grado:</strong> {s.grade}</p>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}