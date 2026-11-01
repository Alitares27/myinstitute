import { businessDate } from "../utils/businessDate";
import { PoolClient } from "pg";
import { pool } from "../models/db";
import { AuthRequest } from "../middleware/auth";
import { InputError, isoDate } from "../utils/validation";
import { addSearch, readPage } from "../utils/pagination";

export const memberSelect = `SELECT u.id,u.name,u.email,u.telefono,u.role,
  CASE WHEN $1='admin' OR u.id=$2 THEN u.document::text ELSE NULL END AS document,
  s.id AS student_id,s.grade,s.enrollment_date AS student_enrollment_date,
  t.id AS teacher_id,t.specialty,t.created_at AS teacher_created_at
  FROM users u LEFT JOIN students s ON s.user_id=u.id LEFT JOIN teachers t ON t.user_id=u.id`;
const assignedStudent = `EXISTS (SELECT 1 FROM enrollments own JOIN courses c ON c.id=own.course_id
  JOIN teachers teacher ON teacher.id=c.teacher_id WHERE own.student_id=s.id AND teacher.user_id=$2)`;
export async function listMembers(req: AuthRequest) {
  const params:any[]=[req.user!.role,req.user!.id];
  const where=[`($1='admin' OR ($1='teacher' AND ${assignedStudent}) OR ($1='student' AND u.id=$2))`];
  if(req.query.role){
    if(!["admin","teacher","student"].includes(String(req.query.role)))throw new InputError("Rol inválido");
    params.push(String(req.query.role));where.push(`u.role=$${params.length}`);
  }
  if(req.query.profile==='student')where.push("s.id IS NOT NULL");
  else if(req.query.profile==='teacher')where.push("t.id IS NOT NULL");
  else if(req.query.profile)throw new InputError("Tipo de registro inválido");
  where.push(...addSearch(req,params,["u.name","u.email","COALESCE(u.telefono,'')","COALESCE(s.grade,'')","COALESCE(t.specialty,'')"]));
  return readPage(req,memberSelect+` WHERE ${where.join(" AND ")}`,params,
    {name:"name",email:"email",role:"role",grade:"grade",student_enrollment_date:"student_enrollment_date"},"name");
}
export async function findMember(id:number,viewer:{id:number;role:string},client=pool as Pick<PoolClient,'query'>){
  const result=await client.query(memberSelect+` WHERE u.id=$3 AND ($1='admin' OR u.id=$2 OR ($1='teacher' AND ${assignedStudent}))`,[viewer.role,viewer.id,id]);
  return result.rows[0];
}
export async function academicDetails(id:number,viewer:{id:number;role:string}){
  const member=await findMember(id,viewer);
  if(!member)return null;
  if(!member.student_id)return {member,courses:[],summary:null};
  const params=[member.student_id,viewer.id,viewer.role==='admin'||viewer.id===id];
  const courseScope="($3::boolean OR c.teacher_id IN (SELECT id FROM teachers WHERE user_id=$2))";
  const [courses,summary]=await Promise.all([
    pool.query(`SELECT c.id AS course_id,c.title,e.enrollment_date,u.name AS teacher_name FROM enrollments e
      JOIN courses c ON c.id=e.course_id LEFT JOIN teachers t ON t.id=c.teacher_id LEFT JOIN users u ON u.id=t.user_id
      WHERE e.student_id=$1 AND ${courseScope} ORDER BY c.title,c.id`,params),
    pool.query(`SELECT
      (SELECT COUNT(*)::int FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=$1 AND ${courseScope}) AS courses,
      (SELECT COUNT(*)::int FROM attendance a JOIN courses c ON c.id=a.course_id WHERE a.student_id=$1 AND a.status='Present' AND ${courseScope}) AS present,
      (SELECT COUNT(*)::int FROM attendance a JOIN courses c ON c.id=a.course_id WHERE a.student_id=$1 AND a.status='Absent' AND ${courseScope}) AS absent,
      (SELECT AVG(g.grade) FROM grades g JOIN courses c ON c.id=g.course_id WHERE g.student_id=$1 AND ${courseScope}) AS average_grade`,params)
  ]);
  return {member,courses:courses.rows,summary:summary.rows[0]};
}
function text(value:unknown,label:string,max:number,required=false){
  if(value==null){if(required)throw new InputError(`${label} es requerido`);return null;}
  if(typeof value!=="string")throw new InputError(`${label} inválido`);
  const result=value.trim();
  if((required&&!result)||result.length>max)throw new InputError(`${label}: revisa el contenido y el máximo de ${max} caracteres`);
  return result||null;
}
export function memberInput(body:any,creating:boolean){
  const name=text(body.name,"Nombre",100,true),email=text(body.email,"Correo",150,true)!;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new InputError("Correo inválido");
  if(!["admin","teacher","student"].includes(body.role))throw new InputError("Rol inválido");
  if(body.include_student_profile!==undefined&&typeof body.include_student_profile!=="boolean")throw new InputError("Registro académico inválido");
  const password=body.password;
  if(password!==undefined && typeof password!=="string")throw new InputError("Contraseña inválida");
  if((creating||password)&& (typeof password!=="string"||password.length<6||Buffer.byteLength(password,'utf8')>72))throw new InputError("La contraseña debe tener al menos 6 caracteres y hasta 72 bytes");
  let document:string|null=null;
  if(body.document!=null&&body.document!==""){
    const value=String(body.document);
    if(!/^\d{1,19}$/.test(value)||BigInt(value)>9223372036854775807n)throw new InputError("Documento inválido");
    document=value;
  }
  const academicDate=body.student_enrollment_date==null||body.student_enrollment_date===""?null:isoDate(body.student_enrollment_date);
  return {name,email,telefono:text(body.telefono,"Teléfono",30),document,role:body.role,password,
    grade:body.grade===undefined?undefined:text(body.grade,"Organización",20),specialty:body.specialty===undefined?undefined:text(body.specialty,"Especialidad",100),
    student_enrollment_date:academicDate,hasAcademicDate:Object.prototype.hasOwnProperty.call(body,'student_enrollment_date'),includeStudent:body.include_student_profile===true};
}
export async function saveProfiles(client:PoolClient,userId:number,input:ReturnType<typeof memberInput>){
  const profiles=await client.query("SELECT id FROM students WHERE user_id=$1",[userId]);
  if(input.role==='student'||input.includeStudent||profiles.rowCount){
    await client.query(`INSERT INTO students(user_id,grade,enrollment_date) VALUES($1,$2,COALESCE($3::date,$6::date))
      ON CONFLICT(user_id) DO UPDATE SET grade=CASE WHEN $4 THEN EXCLUDED.grade ELSE students.grade END,
      enrollment_date=CASE WHEN $5 THEN $3::date ELSE students.enrollment_date END`,
      [userId,input.grade??null,input.student_enrollment_date,input.grade!==undefined,input.hasAcademicDate,businessDate()]);
  }
  const teacher=await client.query("SELECT id FROM teachers WHERE user_id=$1",[userId]);
  if(input.role==='teacher'||teacher.rowCount)await client.query(`INSERT INTO teachers(user_id,specialty) VALUES($1,$2)
    ON CONFLICT(user_id) DO UPDATE SET specialty=CASE WHEN $3 THEN EXCLUDED.specialty ELSE teachers.specialty END`,[userId,input.specialty??null,input.specialty!==undefined]);
}
export async function hasAcademicHistory(client:PoolClient,studentId:number){
  const result=await client.query(`SELECT 1 WHERE EXISTS(SELECT 1 FROM enrollments WHERE student_id=$1)
    OR EXISTS(SELECT 1 FROM attendance WHERE student_id=$1) OR EXISTS(SELECT 1 FROM grades WHERE student_id=$1)`,[studentId]);
  return !!result.rowCount;
}
export async function removeStudentProfile(client:PoolClient,userId:number){
  const member=await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE",[userId]);
  if(!member.rowCount){const error=new InputError("Miembro no encontrado");error.status=404;throw error;}
  const student=await client.query("SELECT id FROM students WHERE user_id=$1 FOR UPDATE",[userId]);
  if(!student.rowCount){const error=new InputError("Registro de estudiante no encontrado");error.status=404;throw error;}
  if(member.rows[0].role==='student')throw new InputError("El rol Estudiante necesita su registro académico; cambia primero el rol de acceso");
  if(await hasAcademicHistory(client,student.rows[0].id)){const error=new InputError("El registro tiene historial académico y debe conservarse");error.status=409;throw error;}
  await client.query("DELETE FROM students WHERE id=$1",[student.rows[0].id]);
}
