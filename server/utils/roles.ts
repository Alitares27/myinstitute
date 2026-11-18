import { PoolClient } from "pg";
import { InputError } from "./validation";
/** Keep historical data: refuse destructive role transitions until dependencies are resolved. */
export async function prepareRoleChange(client: PoolClient, id: unknown, role: unknown) {
  if (!["admin", "student", "teacher"].includes(String(role))) throw new InputError("Rol inválido");
  const user = await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE", [id]);
  if (!user.rowCount) { const error = new InputError("Miembro no encontrado"); error.status=404; throw error; }
  if (user.rows[0].role === role) return;
  if (user.rows[0].role === "admin") await requireAnotherAdmin(client, id);
  if (role !== "teacher") {
    const assigned = await client.query("SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE user_id=$1) LIMIT 1", [id]);
    if (assigned.rowCount) throw new InputError("Reasigna los cursos del docente antes de cambiar su rol");
  }
  if (role !== "student") {
    const history = await client.query(`SELECT 1 FROM students s WHERE s.user_id=$1 AND (
      EXISTS (SELECT 1 FROM enrollments WHERE student_id=s.id) OR EXISTS (SELECT 1 FROM attendance WHERE student_id=s.id)
      OR EXISTS (SELECT 1 FROM grades WHERE student_id=s.id))`, [id]);
    if (history.rowCount) throw new InputError("El estudiante tiene historial académico; conserva su rol o resuelve sus dependencias");
  }
}

export const ALLOWED_MODULES = [
  "panel", "actividades", "agendas", "asistencia", "calificaciones", "consejos",
  "discursantes", "inscripciones", "maestros", "miembros", "templos", "viajes-templo",
  "pagos-templos", "reservar-viajes", "auditorias", "sincronizacion",
] as const;

export type Module = typeof ALLOWED_MODULES[number];

export function leaderPermissions(value: unknown): Module[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(module => !ALLOWED_MODULES.includes(module))) {
    throw new InputError("Selecciona páginas válidas para el Líder.");
  }
  return [...new Set<Module>(value)].sort();
}

export async function saveLeaderPermissions(client: PoolClient, id: unknown, permissions: Module[]) {
  await client.query(`UPDATE users SET permissions=$2::text[]
    WHERE id=$1 AND permissions IS DISTINCT FROM $2::text[]`, [id, permissions]);
}

export async function lockAccountAdministration(client: PoolClient, actorId: number) {
  await client.query("SELECT pg_advisory_xact_lock(324176, 1)");
  const actor = await client.query("SELECT 1 FROM users WHERE id=$1 AND role='admin'", [actorId]);
  if (!actor.rowCount) {
    const error = new InputError("Se requiere una cuenta administradora activa.");
    error.status = 403;
    throw error;
  }
  await client.query("SELECT set_config('gestionar.actor_id', $1, true)", [String(actorId)]);
}

export async function requireAnotherAdmin(client: PoolClient, id: unknown) {
  const result = await client.query("SELECT 1 FROM users WHERE role='admin' AND id<>$1 LIMIT 1", [id]);
  if (!result.rowCount) {
    const error = new InputError("Debe quedar al menos un administrador.");
    error.status = 409;
    throw error;
  }
}
