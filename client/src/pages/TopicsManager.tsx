import { useEffect, useState, useMemo } from "react";
import api from "../api";
import axios from "axios";

interface Topic {
  id: number;
  course_id: number;
  title: string;
  description: string;
  order_index: number;
}

interface Course {
  id: number;
  title: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TopicsManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", order_index: 0 });

  const headers = { Authorization: `Bearer ${sessionStorage.getItem("token")}` };

  useEffect(() => {
    fetchCourses();
    fetchTopics();
  }, []);

  const fetchCourses = async () => {
    const res = await axios.get(`${API_BASE_URL}/courses`, { headers });
    setCourses(res.data);
  };

  const fetchTopics = async () => {
    const res = await axios.get(`${API_BASE_URL}/topics`, { headers });
    setTopics(res.data);
  };

  const filteredTopics = useMemo(() =>
    topics.filter(t => t.course_id === Number(selectedCourseId)),
    [topics, selectedCourseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return alert("Selecciona un curso primero");

    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/topics/${editingId}`, form, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/topics`, { ...form, course_id: selectedCourseId }, { headers });
      }
      setForm({ title: "", description: "", order_index: 0 });
      setEditingId(null);
      fetchTopics();
    } catch (err) { alert("Error al guardar"); }
  };

  const handleEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setForm({ title: topic.title, description: topic.description, order_index: topic.order_index });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este tema?")) return;
    await axios.delete(`${API_BASE_URL}/topics/${id}`, { headers });
    fetchTopics();
  };

  return (
    <div>
      <h2>📚 Gestión de Temas del Manual</h2>

      <div>
        <label>Seleccionar Curso: </label>
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
          <option value="">-- Seleccione un curso --</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {selectedCourseId && (
        <>
          <form onSubmit={handleSubmit} >
            <h3>{editingId ? "Editar Tema" : "Nuevo Tema"}</h3>
            <input type="text" placeholder="Título del Capítulo" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input type="number" placeholder="Orden" value={form.order_index} onChange={e => setForm({ ...form, order_index: Number(e.target.value) })} />
            <br /><br />
            <textarea placeholder="Descripción" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="extracted-style-16" />
            <br />
            <button type="submit" className="btn primary">{editingId ? "Actualizar" : "Agregar"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setForm({ title: "", description: "", order_index: 0 }) }}>Cancelar</button>}
          </form>

          <table border={1}>
            <thead>
              <tr className="extracted-style-18">
                <th>Orden</th>
                <th>Título</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map(t => (
                <tr key={t.id}>
                  <td className="extracted-style-19">{t.order_index}</td>
                  <td>{t.title}</td>
                  <td>
                    <button onClick={() => handleEdit(t)}>Editar</button>
                    <button onClick={() => handleDelete(t.id)} className="extracted-style-4">Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}