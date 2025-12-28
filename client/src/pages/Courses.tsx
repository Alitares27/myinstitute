import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ id: "", title: "", teacher_id: "" });

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const meRes = await axios.get(`${API_URL}/users/me`, config);
        setRole(meRes.data.role);

        const coursesRes = await axios.get(`${API_URL}/courses`, config);
        setCourses(coursesRes.data);

        if (meRes.data.role === "admin") {
          const teachersRes = await axios.get(`${API_URL}/teachers`, config);
          setTeachers(teachersRes.data);
        }
      } catch (err) {
        setError("Error al cargar los datos de cursos.");
      }
    };

    fetchCoursesData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        await axios.put(`${API_URL}/courses/${form.id}`, form, config);
      } else {
        await axios.post(`${API_URL}/courses`, form, config);
      }
      window.location.reload();
    } catch {
      setError("Error al guardar el curso.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este curso?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(courses.filter((c) => c.id !== id));
    } catch {
      setError("No se pudo eliminar el curso.");
    }
  };

  const handleEdit = (course: any) => {
    setForm({ 
      id: course.id, 
      title: course.title, 
      teacher_id: course.teacher_id || "" 
    });
  };

  return (
    <div className="page-container">
      <h2>📚 {role === "admin" ? "Administrar Cursos" : "Cursos Disponibles"}</h2>
      <h3>{form.id ? "✏️ Actualizar" : "➕ Agregar"}</h3>

      {role === "admin" && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem", display: "flex", gap: "10px" }}>
          <input
            placeholder="Nombre del Curso"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <select
            value={form.teacher_id}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            required
          >
            <option value="">Asignar Maestro</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit">{form.id ? "Actualizar" : "Crear"}</button>
          {form.id && <button type="button" onClick={() => setForm({ id: "", title: "", teacher_id: "" })}>Cancelar</button>}
        </form>
      )}

      <table border={1} style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th style={{ padding: "10px" }}>ID</th>
            <th style={{ padding: "10px" }}>Título</th>
            <th style={{ padding: "10px" }}>Maestro</th>
            {role === "admin" && <th style={{ padding: "10px" }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td style={{ padding: "10px" }}>{c.id}</td>
              <td style={{ padding: "10px" }}>{c.title}</td>
              <td style={{ padding: "10px" }}>{c.teacher_name || "No asignado"}</td>
              {role === "admin" && (
                <td style={{ padding: "10px" }}>
                  <button onClick={() => handleEdit(c)} style={{ marginRight: "5px" }}>✏️</button>
                  <button onClick={() => handleDelete(c.id)}>🗑️</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}