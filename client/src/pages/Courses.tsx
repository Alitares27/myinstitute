import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ id: "", title: "", teacher_id: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCoursesData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const meRes = await axios.get(`${API_BASE_URL}/users/me`, config);
        setRole(meRes.data.role);

        const coursesRes = await axios.get(`${API_BASE_URL}/courses`, config);
        setCourses(coursesRes.data);

        if (meRes.data.role === "admin") {
          const teachersRes = await axios.get(`${API_BASE_URL}/teachers`, config);
          setTeachers(teachersRes.data);
        }
      } catch (err) {
        console.error("Error cargando cursos:", err);
        setError("No se pudieron cargar los datos. Verifica la conexión con el servidor.");
      }
    };

    fetchCoursesData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        await axios.put(`${API_BASE_URL}/courses/${form.id}`, form, config);
      } else {
        await axios.post(`${API_BASE_URL}/courses`, form, config);
      }
      
      const updatedCourses = await axios.get(`${API_BASE_URL}/courses`, config);
      setCourses(updatedCourses.data);
      setForm({ id: "", title: "", teacher_id: "" });
      setError("");
      alert(form.id ? "Curso actualizado" : "Curso creado con éxito");
    } catch (err) {
      setError("Error al guardar el curso. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este curso?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/courses/${id}`, {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-container">
      <h2>📚 {role === "admin" ? "Administrar Cursos" : "Cursos Disponibles"}</h2>
      
      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "10px", borderRadius: "5px" }}>⚠️ {error}</p>}

      {role === "admin" && (
        <div className="form-section">
          <h3>{form.id ? "✏️ Actualizar Curso" : "➕ Agregar Nuevo Curso"}</h3>
          <form onSubmit={handleSubmit}>
            <input
              placeholder="Nombre del Curso"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", flex: "1" }}
            />
            <select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              required
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="">Asignar Maestro</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button type="submit" disabled={loading} style={{ padding: "8px 15px", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px" }}>
              {loading ? "Guardando..." : (form.id ? "Actualizar" : "Crear")}
            </button>
            {form.id && (
              <button type="button" onClick={() => setForm({ id: "", title: "", teacher_id: "" })} style={{ padding: "8px 15px", cursor: "pointer" }}>
                Cancelar
              </button>
            )}
          </form>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table border={1} style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", marginTop: "10px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              <th style={{ padding: "12px" }}>ID</th>
              <th style={{ padding: "12px" }}>Título</th>
              <th style={{ padding: "12px" }}>Maestro</th>
              {role === "admin" && <th style={{ padding: "12px" }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {courses.length > 0 ? (
              courses.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "12px" }}>{c.id}</td>
                  <td style={{ padding: "12px" }}>{c.title}</td>
                  <td style={{ padding: "12px" }}>{c.teacher_name || "No asignado"}</td>
                  {role === "admin" && (
                    <td style={{ padding: "12px" }}>
                      <button onClick={() => handleEdit(c)} style={{ marginRight: "8px", cursor: "pointer" }}>✏️</button>
                      <button onClick={() => handleDelete(c.id)} style={{ cursor: "pointer", color: "red" }}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={role === "admin" ? 4 : 3} style={{ textAlign: "center", padding: "20px" }}>No hay cursos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}