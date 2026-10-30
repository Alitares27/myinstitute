import { PoolClient } from "pg";
import { InputError } from "./validation";
/** Keep historical data: refuse destructive role transitions until dependencies are resolved. */
export async function prepareRoleChange(client: PoolClient, id: unknown, role: unknown) {
  if (!["admin", "student", "teacher"].includes(String(role))) throw new InputError("Rol inválido");
  const user = await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE", [id]);
  if (!user.rowCount) { const error = new InputError("Miembro no encontrado"); error.status=404; throw error; }
  if (role !== "teacher") {
    const assigned = await client.query("SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id=$1) LIMIT 1", [id]);
    if (assigned.rowCount) throw new InputError("Reasigna los cursos del docente antes de cambiar su rol");
    await client.query("DELETE FROM teachers WHERE user_id=$1", [id]);
  }
  if (role !== "student") {
    const history = await client.query(`SELECT 1 FROM students s WHERE s.user_id=$1 AND (
      EXISTS (SELECT 1 FROM enrollments WHERE student_id=s.id) OR EXISTS (SELECT 1 FROM attendance WHERE student_id=s.id)
      OR EXISTS (SELECT 1 FROM grades WHERE student_id=s.id))`, [id]);
    if (history.rowCount) throw new InputError("El estudiante tiene historial académico; conserva su rol o resuelve sus dependencias");
    await client.query("DELETE FROM students WHERE user_id=$1", [id]);
  }
}
