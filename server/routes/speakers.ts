import { Router } from "express";
import { pool } from "../models/db";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id, 
        s.member_id, 
        s.tema_id,
        u.name AS member_name, 
        t.title AS topic, 
        s.speech_title, 
        s.duration_minutes AS time, 
        s.speech_date AS date,
        CASE WHEN s.is_completed = true THEN 'Si' ELSE 'No' END as completed
      FROM speakers s
      LEFT JOIN users u ON s.member_id = u.id
      LEFT JOIN temas t ON s.tema_id = t.id
      ORDER BY s.speech_date DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en GET /speakers:", err);
    res.status(500).json({ message: "Error al obtener discursantes" });
  }
});

router.post("/", async (req, res) => {
  const { member_id, tema_id, speech_title, time, date } = req.body;
  try {
    const query = `
      INSERT INTO speakers (member_id, tema_id, speech_title, duration_minutes, speech_date, is_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *, 
      duration_minutes AS time, 
      speech_date AS date,
      'No' as completed;
    `;
    const result = await pool.query(query, [
      parseInt(member_id),
      parseInt(tema_id),
      speech_title,
      parseInt(time) || 10,
      date
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en POST /speakers:", err);
    res.status(500).json({ message: "Error al registrar discurso" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { member_id, tema_id, speech_title, time, date, completed } = req.body;

  try {
    const query = `
      UPDATE speakers 
      SET 
        member_id = $1, 
        tema_id = $2, 
        speech_title = $3, 
        duration_minutes = $4, 
        speech_date = $5, 
        is_completed = $6
      WHERE id = $7
      RETURNING *, 
      duration_minutes AS time, 
      speech_date AS date,
      CASE WHEN is_completed = true THEN 'Si' ELSE 'No' END as completed;
    `;
    const values = [
      parseInt(member_id),
      parseInt(tema_id),
      speech_title,
      parseInt(time),
      date,
      completed === 'Si',
      id
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Discurso no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error en PUT /speakers:", err);
    res.status(500).json({ message: "Error al actualizar discurso" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM speakers WHERE id = $1", [id]);
    res.json({ message: "Registro eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en DELETE /speakers:", err);
    res.status(500).json({ message: "Error al eliminar registro" });
  }
});

export default router;