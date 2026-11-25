import { asyncRouter } from "../middleware/asyncRouter";
import { Router } from "express";
import { pool } from "../models/db";
import { verifyToken, isAdmin, AuthRequest, requireModuleAccess } from "../middleware/auth";
import { officialSpeechUrl,selectedSpeechReference } from "../utils/speechReference";
import { InputError } from "../utils/validation";
import {searchOnlineSpeeches} from '../utils/onlineSpeechSearch';
import rateLimit from 'express-rate-limit';

const router = asyncRouter();
router.get('/members',verifyToken,requireModuleAccess('discursantes'),isAdmin,async(_req,res)=>{
  res.json((await pool.query('SELECT id,name FROM users ORDER BY name,id')).rows);
});
const onlineSearchLimit=rateLimit({windowMs:60000,limit:20,standardHeaders:true,legacyHeaders:false,keyGenerator:(req)=>String((req as AuthRequest).user!.id),message:{message:'Espera un momento antes de realizar otra búsqueda.'}});

router.get('/search-online',verifyToken,requireModuleAccess('discursantes'),onlineSearchLimit,async(req,res)=>{
  try{return res.json(await searchOnlineSpeeches(req.query.q,req.query.page??1));}
  catch(error){if(error instanceof InputError)throw error;return res.status(502).json({message:'El buscador oficial no está disponible. Intenta nuevamente o abre la búsqueda en el sitio oficial.'});}
});

router.get('/catalog',verifyToken,requireModuleAccess('discursantes'),async(_req,res)=>{
  res.json((await pool.query('SELECT id,title,author,conference,url,topics FROM speech_references ORDER BY title,id')).rows);
});
router.post('/catalog',verifyToken,requireModuleAccess('discursantes'),isAdmin,async(req:AuthRequest,res)=>{
  const {title,author,conference,topics}=req.body;
  if(![title,author,conference].every(value=>typeof value==='string'&&value.trim().length>0)||title.length>250||author.length>150||conference.length>100||!Array.isArray(topics)||!topics.length||topics.length>20||topics.some(value=>typeof value!=='string'||!value.trim()||value.length>80))throw new InputError('Completa título, autor, conferencia y entre 1 y 20 temas.');
  const url=officialSpeechUrl(req.body.url);
  const result=await pool.query(`INSERT INTO speech_references(title,author,conference,url,topics,created_by)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(url) DO NOTHING RETURNING id,title,author,conference,url,topics`,[title.trim(),author.trim(),conference.trim(),url,[...new Set(topics.map((v:string)=>v.trim()))],req.user!.id]);
  if(!result.rowCount){const existing=(await pool.query('SELECT id,title,author,conference,url,topics FROM speech_references WHERE url=$1',[url])).rows[0];return res.status(409).json({message:'Este discurso ya está en el catálogo.',reference:existing});}
  return res.status(201).json(result.rows[0]);
});

router.get("/", verifyToken, requireModuleAccess("discursantes"), async (req: AuthRequest, res) => {
  try {
    const query = `
      SELECT
        s.id,
        s.member_id,
        s.tema_id,
        u.name AS member_name,
        t.title AS topic,
        s.speech_title,
        s.speech_reference_id,
        r.author AS speech_author,r.conference AS speech_conference,r.url AS speech_url,
        s.duration_minutes AS time,
        s.speech_date AS date,
        CASE WHEN s.is_completed = true THEN 'Si' ELSE 'No' END as completed
      FROM speakers s
      LEFT JOIN users u ON s.member_id = u.id
      LEFT JOIN temas t ON s.tema_id = t.id
      LEFT JOIN speech_references r ON r.id=s.speech_reference_id
      ORDER BY s.speech_date DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error en GET /speakers:", err);
    res.status(500).json({ message: "Error al obtener discursantes" });
  }
});

router.post("/", verifyToken, requireModuleAccess("discursantes"), isAdmin, async (req: AuthRequest, res) => {
  const { member_id, tema_id, speech_title, time, date } = req.body;
  try {
    const reference=await selectedSpeechReference(req.body.speech_reference_id);
    const query = `
      INSERT INTO speakers (member_id, tema_id, speech_title, duration_minutes, speech_date, is_completed,speech_reference_id)
      VALUES ($1, $2, $3, $4, $5, false,$6)
      RETURNING *,
      duration_minutes AS time,
      speech_date AS date,
      'No' as completed
    `;
    const result = await pool.query(query, [
      parseInt(member_id),
      parseInt(tema_id),
      reference?.title??speech_title,
      parseInt(time) || 10,
      date,
      reference?.id??null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if(err instanceof InputError)return res.status(400).json({message:err.message});
    console.error("❌ Error en POST /speakers:", err);
    res.status(500).json({ message: "Error al registrar discurso" });
  }
});

router.put("/:id", verifyToken, requireModuleAccess("discursantes"), isAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { member_id, tema_id, speech_title, time, date, completed } = req.body;

  try {
    const hasReference=Object.prototype.hasOwnProperty.call(req.body,'speech_reference_id');
    const reference=await selectedSpeechReference(req.body.speech_reference_id);
    const query = `
      UPDATE speakers
      SET
        member_id = $1,
        tema_id = $2,
        speech_title = $3,
        duration_minutes = $4,
        speech_date = $5,
        is_completed = $6,
        speech_reference_id = CASE WHEN $9::boolean THEN $8::integer ELSE speech_reference_id END
      WHERE id = $7
      RETURNING *,
      duration_minutes AS time,
      speech_date AS date,
      CASE WHEN is_completed = true THEN 'Si' ELSE 'No' END as completed
    `;
    const values = [
      parseInt(member_id),
      parseInt(tema_id),
      reference?.title??speech_title,
      parseInt(time),
      date,
      completed === 'Si',
      id,
      reference?.id??null,
      hasReference
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Discurso no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if(err instanceof InputError)return res.status(400).json({message:err.message});
    console.error("❌ Error en PUT /speakers:", err);
    res.status(500).json({ message: "Error al actualizar discurso" });
  }
});

router.delete("/:id", verifyToken, requireModuleAccess("discursantes"), isAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM speakers WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Discurso no encontrado" });
    res.json({ message: "Registro eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en DELETE /speakers:", err);
    res.status(500).json({ message: "Error al eliminar registro" });
  }
});

export default router;
