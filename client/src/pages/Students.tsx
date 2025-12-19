import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", name: "", grade: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    axios.get(`${API_URL}/me`, config).then((res) => {
      setRole(res.data.role);
      setUserId(res.data.id);
    });

    axios.get(`${API_URL}/students`, config).then((res) => setStudents(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (form.id) {
        const res = await axios.put(`${API_URL}/students/${form.id}`, 
          { name: form.name, grade: form.grade }, config
        );
        setStudents(students.map((s) => (s.id === form.id ? res.data : s)));
        alert("Estudiante actualizado");
      } else {
        const res = await axios.post(`${API_URL}/students`, form, config);
        setStudents([...students, res.data]);
      }
      setForm({ id: "", name: "", grade: "" });
    } catch (error) {
      alert("Error al procesar la solicitud");
    }
  };

  const handleEdit = (student: any) => {
    setForm({ 
      id: student.id, 
      name: student.name, 
      grade: student.grade 
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este estudiante?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(students.filter((s) => s.id !== id));
    } catch (error) {
      alert("Error al eliminar");
    }
  };

  const filteredStudents = role === "student" 
    ? students.filter((s) => s.user_id === userId) 
    : students;

  return (
    <div className="students-page">
      <h2>👨‍🎓 Estudiantes</h2>

      {role === "admin" && (
        <div style={{ background: "#f4f4f4", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3>{form.id ? "Editar Estudiante" : "Agregar Nuevo"}</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Organización/Grado"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              required
            />
            <button type="submit" style={{ backgroundColor: form.id ? "#2196F3" : "#4CAF50", color: "white" }}>
              {form.id ? "Guardar Cambios" : "Agregar Estudiante"}
            </button>
            {form.id && <button onClick={() => setForm({ id: "", name: "", grade: "" })}>Cancelar</button>}
          </form>
        </div>
      )}

      {role === "admin" ? (
        <table className="students-table" border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#ddd" }}>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Organización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.telefono}</td>
                <td>{s.grade}</td>
                <td>
                  <button onClick={() => handleEdit(s)} style={{ marginRight: "5px" }}>✏️</button>
                  <button onClick={() => handleDelete(s.id)} style={{ color: "red" }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="student-list">
          {filteredStudents.map((s) => (
            <div key={s.id} className="student-info" style={{ border: "1px solid #ccc", padding: "10px", margin: "10px 0" }}>
              <p><strong>Nombre:</strong> {s.name}</p>
              <p><strong>Organización:</strong> {s.grade}</p>
              <p><strong>Email:</strong> {s.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}