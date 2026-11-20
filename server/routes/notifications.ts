import { Response } from "express";
import { asyncRouter } from "../middleware/asyncRouter";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";
import { pool } from "../models/db";
import { attendanceReminder } from "../utils/notificationSchedule";
import type { Module } from "../utils/roles";

const router = asyncRouter();
router.use(verifyToken);
const settings = async () => (await pool.query("SELECT * FROM notification_settings WHERE id=1")).rows[0];
const allowed = (req: AuthRequest, module: Module) => req.user?.role === "admin" || req.user?.role === "student" || req.user?.permissions?.includes(module);

async function feed(req: AuthRequest) {
  const config = await settings();
  const items: {id: string; title: string; message: string; href: string; date: string; read?: boolean}[] = [];
  if (config.activities_enabled && allowed(req,"actividades")) {
    const rows = await pool.query(`SELECT id, activity_name AS title, activity_datetime::text AS date
      FROM activity_plans WHERE activity_datetime >= (now() AT TIME ZONE $1)
      AND activity_datetime::date <= (now() AT TIME ZONE $1)::date + $2::integer
      ORDER BY activity_datetime LIMIT 200`, [config.time_zone,config.activity_days]);
    for (const row of rows.rows) items.push({id:`activity:${row.id}:${row.date}`,title:"Próxima actividad",message:row.title,href:"/actividades",date:row.date});
  }
  if (config.meetings_enabled && allowed(req,"consejos")) {
    const rows = await pool.query(`SELECT m.id, m.title, (m.meeting_date + COALESCE(m.start_time,'00:00'::time))::text AS date
      FROM meetings m WHERE (m.meeting_date + COALESCE(m.start_time,'00:00'::time)) >= (now() AT TIME ZONE $1)
      AND m.meeting_date <= (now() AT TIME ZONE $1)::date + $2::integer
      AND lower(COALESCE(m.status,'')) NOT IN ('cancelado','cancelled','completado','completed')
      AND ($3='admin' OR m.created_by=$4 OR EXISTS (SELECT 1 FROM meeting_attendees ma WHERE ma.meeting_id=m.id AND ma.user_id=$4))
      ORDER BY m.meeting_date,m.start_time LIMIT 200`,[config.time_zone,config.meeting_days,req.user!.role,req.user!.id]);
    for (const row of rows.rows) items.push({id:`meeting:${row.id}:${row.date}`,title:"Próximo consejo",message:row.title,href:`/consejos/${row.id}`,date:row.date});
  }
  if (config.attendance_enabled && req.user!.role !== "student" && allowed(req,"asistencia")) {
    const date=attendanceReminder(new Date(),config.time_zone,config.attendance_day,config.attendance_time);
    if (date) {
      const assigned=req.user!.role === "admin" || (await pool.query("SELECT 1 FROM courses c JOIN teachers t ON t.id=c.teacher_id WHERE t.user_id=$1 LIMIT 1",[req.user!.id])).rows.length>0;
      if (assigned) items.push({id:`attendance:${date}`,title:"Registrar asistencia",message:"Recuerda registrar la asistencia de tus cursos.",href:"/asistencia",date});
    }
  }
  const reads=await pool.query("SELECT notification_key FROM notification_reads WHERE user_id=$1 AND notification_key=ANY($2::text[])",[req.user!.id,items.map(item=>item.id)]);
  const keys=new Set(reads.rows.map(row=>row.notification_key));
  return items.sort((a,b)=>a.date.localeCompare(b.date)).map(item=>({...item,read:keys.has(item.id)}));
}
router.get("/settings",isAdmin,async (_req,res: Response)=>res.json(await settings()));
router.put("/settings",isAdmin,async (req,res: Response)=>{
  const b=req.body;
  if (!b || ![b.activity_days,b.meeting_days].every(v=>Number.isInteger(v)&&v>=0&&v<=365) || !Number.isInteger(b.attendance_day)||b.attendance_day<0||b.attendance_day>6 || typeof b.attendance_time!=="string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.attendance_time) || ![b.activities_enabled,b.meetings_enabled,b.attendance_enabled].every(v=>typeof v==="boolean")) return res.status(400).json({message:"Revisa los días, la hora y las opciones de notificación."});
  try { if (typeof b.time_zone!=="string" || b.time_zone.length>100) throw Error(); new Intl.DateTimeFormat("es",{timeZone:b.time_zone}); } catch { return res.status(400).json({message:"Zona horaria inválida."}); }
  const result=await pool.query(`UPDATE notification_settings SET activity_days=$1,meeting_days=$2,attendance_day=$3,attendance_time=$4,time_zone=$5,activities_enabled=$6,meetings_enabled=$7,attendance_enabled=$8 WHERE id=1 RETURNING *`,[b.activity_days,b.meeting_days,b.attendance_day,b.attendance_time,b.time_zone,b.activities_enabled,b.meetings_enabled,b.attendance_enabled]);
  res.json(result.rows[0]);
});
router.get("/",async(req:AuthRequest,res:Response)=>res.json(await feed(req)));
router.post("/read",async(req:AuthRequest,res:Response)=>{
  const ids=req.body?.ids;
  if (!Array.isArray(ids)||ids.length>500||ids.some(id=>typeof id!=="string"||id.length>200)) return res.status(400).json({message:"Notificaciones inválidas."});
  const visible=new Set((await feed(req)).map(item=>item.id));
  const keys=ids.filter(id=>visible.has(id));
  await pool.query("INSERT INTO notification_reads(user_id,notification_key) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING",[req.user!.id,keys]);
  res.json({ok:true});
});
export default router;
