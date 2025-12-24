import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", name: "", grade: "" });
  const [role, setRole] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

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

  const filteredStudents = useMemo(() => {
    return role === "student"
      ? students.filter((s) => s.user_id === userId)
      : students;
  }, [students, role, userId]);

  const totalPages = Math.ceil(filteredStudents.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const lastIdx = currentPage * recordsPerPage;
    const firstIdx = lastIdx - recordsPerPage;
    return filteredStudents.slice(firstIdx, lastIdx);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="students-page">
      <h2>👨‍🎓 Estudiantes</h2>
      <h3>{form.id ? "✏️ Actualizar" : "➕ Agregar"}</h3>
      {role === "admin" && (

        <div className="form-card">

          <form onSubmit={handleSubmit} className="grid-form">
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Organización"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              required
            />
            <button type="submit">
              {form.id ? "Actualizar" : "Agregar"}
            </button>
            {form.id && (
              <button type="button" className="cancel-button" onClick={() => setForm({ id: "", name: "", grade: "" })}>
                Cancelar
              </button>
            )}
          </form>
        </div>
      )}

      {role === "admin" ? (
        <table className="students-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Organización</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.telefono}</td>
                <td>{s.grade}</td>
                <td>
                  <button onClick={() => handleEdit(s)} className="edit-button">✏️</button>
                  <button onClick={() => handleDelete(s.id)} className="delete-button">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="student-list">
          {currentRecords.map((s) => (
            <div key={s.id} className="student-info">
              <p><strong>Nombre:</strong> {s.name}</p>
              <p><strong>Organización:</strong> {s.grade}</p>
              <p><strong>Email:</strong> {s.email}</p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={currentPage === i + 1 ? "active" : ""}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}