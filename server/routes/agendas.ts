import { asyncRouter } from "../middleware/asyncRouter";
import { isAdmin, verifyToken } from "../middleware/auth";
import { pool } from "../models/db";
import { InputError, isoDate, positiveId } from "../utils/validation";

const router = asyncRouter();
const memberFields = [
  "opening_prayer_id", "baptism_talk_id", "baptism_id", "witness_one_id",
  "witness_two_id", "holy_ghost_talk_id", "confirmation_id", "closing_prayer_id",
];
const fields = ["scheduled_at", "friend", "opening_hymn", "closing_hymn", ...memberFields];

const agendaSelect = `
  SELECT a.*, to_char(a.scheduled_at, 'YYYY-MM-DD"T"HH24:MI') AS scheduled_at,
    COALESCE((
      SELECT json_object_agg(u.id, u.name) FROM users u
      WHERE u.id IN (${memberFields.map(field => "a." + field).join(", ")})
    ), '{}'::json) AS member_names
  FROM baptism_agendas a
`;

function text(value: unknown, label: string, required = false) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if ((required && !trimmed) || trimmed.length > 150 ||
      (value != null && typeof value !== "string")) {
    throw new InputError(`${label}: ingresa un texto válido de hasta 150 caracteres.`);
  }
  return trimmed;
}

function valuesFrom(body: Record<string, unknown>) {
  const date = body.scheduled_at;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(date)) {
    throw new InputError("Ingresa una fecha y hora válidas.");
  }
  isoDate(date.slice(0, 10));
  const memberIds = memberFields.map(field => {
    const value = body[field];
    if (value == null || value === "") return null;
    if (typeof value !== "number" && typeof value !== "string") {
      throw new InputError("Selecciona un miembro válido.");
    }
    const id = positiveId(value);
    if (id > 2147483647) throw new InputError("Selecciona un miembro válido.");
    return id;
  });
  return [date, text(body.friend, "Amigo", true), text(body.opening_hymn, "Primer himno"),
    text(body.closing_hymn, "Segundo himno"), ...memberIds];
}

router.get("/", verifyToken, async (_req, res) => {
  const result = await pool.query(agendaSelect + " ORDER BY a.scheduled_at DESC, a.id DESC");
  res.json(result.rows);
});

router.get("/members", verifyToken, isAdmin, async (_req, res) => {
  const result = await pool.query("SELECT id, name FROM users ORDER BY name, id");
  res.json(result.rows);
});

router.post("/", verifyToken, isAdmin, async (req, res) => {
  const values = valuesFrom(req.body ?? {});
  try {
    const result = await pool.query(`
      WITH saved AS (
        INSERT INTO baptism_agendas (${fields.join(", ")})
        VALUES (${fields.map((_, i) => "$" + (i + 1)).join(", ")})
        RETURNING *
      )
      ${agendaSelect.replace("FROM baptism_agendas a", "FROM saved a")}
    `, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new InputError("Uno de los miembros seleccionados ya no existe.");
    throw error;
  }
});

router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  const id = positiveId(req.params.id);
  const values = valuesFrom(req.body ?? {});
  try {
    const result = await pool.query(`
      WITH saved AS (
        UPDATE baptism_agendas SET ${fields.map((field, i) => field + " = $" + (i + 1)).join(", ")}
        WHERE id = $${fields.length + 1}
        RETURNING *
      )
      ${agendaSelect.replace("FROM baptism_agendas a", "FROM saved a")}
    `, [...values, id]);
    if (!result.rowCount) return res.status(404).json({ message: "Agenda no encontrada." });
    res.json(result.rows[0]);
  } catch (error) {
    if ((error as { code?: string }).code === "23503") throw new InputError("Uno de los miembros seleccionados ya no existe.");
    throw error;
  }
});

router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  const result = await pool.query("DELETE FROM baptism_agendas WHERE id = $1", [positiveId(req.params.id)]);
  if (!result.rowCount) return res.status(404).json({ message: "Agenda no encontrada." });
  res.json({ message: "Agenda eliminada." });
});

export default router;
