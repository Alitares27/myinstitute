import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";

export default function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", title: "", teacher_id: "" });
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
      .get("http://localhost:5000/api/courses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setCourses(res.data));

    axios
      .get("http://localhost:5000/api/teachers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setTeachers(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.id) {
      const res = await axios.put(
        `http://localhost:5000/api/courses/${form.id}`,
        { title: form.title, teacher_id: form.teacher_id },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setCourses(
        courses.map((c) => (c.id === form.id ? res.data : c))
      );
    } else {
      const res = await axios.post("http://localhost:5000/api/courses", form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCourses([...courses, res.data]);
    }

    setForm({ id: "", title: "", teacher_id: "" });
  };

  const handleEdit = (course: any) => {
    setForm({ id: course.id, title: course.title, teacher_id: course.teacher_id });
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`http://localhost:5000/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setCourses(courses.filter((c) => c.id !== id));
  };

  const filteredCourses =
    role === "student"
      ? courses.filter((c) => c.students?.includes(userId))
      : courses;

  return (
    <Layout>
      <div className="courses-page">
        <h2>📚 Courses</h2>

        {role === "admin" && (
          <form onSubmit={handleSubmit} className="course-form">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="submit">
              {form.id ? "Update Course" : "Add Course"}
            </button>
          </form>
        )}

        <table className="courses-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Teacher</th>
              {role === "admin" && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>
                  {teachers.find((t) => t.id === c.teacher_id)?.name ||
                    c.teacher_name}
                </td>
                {role === "admin" && (
                  <td>
                    <button onClick={() => handleEdit(c)}>Edit</button>
                    <button onClick={() => handleDelete(c.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}