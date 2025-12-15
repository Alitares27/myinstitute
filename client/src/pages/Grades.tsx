import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/Global.css";

export default function Grades() {
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [form, setForm] = useState({
    student_id: "",
    course_id: "",
    grade: "",
    grade_type: "examen",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        const meRes = await axios.get("http://localhost:5000/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRole(meRes.data.role);
        setUserId(meRes.data.id);

        const res = await axios.get("http://localhost:5000/api/grades", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGrades(res.data);

        if (meRes.data.role === "admin") {
          const [studentsRes, coursesRes] = await Promise.all([
            axios.get("http://localhost:5000/api/students", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("http://localhost:5000/api/courses", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          setStudents(studentsRes.data);
          setCourses(coursesRes.data);
        }
      } catch (err: any) {
        console.error("❌ Error fetching data:", err);
        setError(err.response?.data?.message || "Error al cargar datos");
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/grades/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGrades(grades.filter((g) => g.id !== id));
    } catch {
      setError("Error al eliminar calificación");
    }
  };

  const handleEdit = async (id: string, newGrade: number, newType: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/api/grades/${id}`,
        { grade: newGrade, grade_type: newType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrades(grades.map((g) => (g.id === id ? res.data : g)));
    } catch {
      setError("Error al actualizar calificación");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/grades",
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrades([...grades, res.data]);
      setForm({ student_id: "", course_id: "", grade: "", grade_type: "examen" });
    } catch {
      setError("Error al crear calificación");
    }
  };

  const filteredGrades =
    role === "student"
      ? grades.filter((g) => g.student_id === userId)
      : grades;

  return (
    <div className="page-container">
      <h2>📊 Calificaciones</h2>

      {error && <p className="error">{error}</p>}

      
      {role === "admin" && (
        <form onSubmit={handleCreate} className="grade-form">
          
          <select
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">Seleccionar Estudiante</option>
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
            <option value="">Seleccionar Curso</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <input
            placeholder="Nota"
            type="number"
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
          />
          <select
            value={form.grade_type}
            onChange={(e) => setForm({ ...form, grade_type: e.target.value })}
          >
            <option value="examen">Examen</option>
            <option value="tarea">Tarea</option>
            <option value="proyecto">Proyecto</option>
            <option value="participacion">Participación</option>
          </select>
          <button type="submit">➕ Crear Calificación</button>
        </form>
      )}

      {filteredGrades.length === 0 ? (
        <p className="no-grades">
          ⚠️ No hay calificaciones registradas{" "}
          {role === "student" ? "para este estudiante" : ""}.
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {role === "admin" && <th>Estudiante</th>}
              <th>Curso</th>
              <th>Nota</th>
              <th>Tipo</th>
              <th>Fecha</th>
              {role === "admin" && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredGrades.map((g) => (
              <tr key={g.id}>
                {role === "admin" && <td>{g.student_name}</td>}
                <td>{g.course_title}</td>
                <td>{g.grade}</td>
                <td>{g.grade_type}</td>
                <td>{new Date(g.created_at).toLocaleDateString()}</td>
                {role === "admin" && (
                  <td>
                    <button
                      onClick={() => handleEdit(g.id, g.grade + 1, g.grade_type)}
                    >
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleDelete(g.id)}>🗑️ Eliminar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}