import { academicDetails, findMember, listMembers, memberInput, memberSelect, saveProfiles, removeStudentProfile, hasAcademicHistory } from "../services/members";
import { positiveId } from "../utils/validation";
import { prepareRoleChange } from "../utils/roles";
import { InputError } from "../utils/validation";
import { asyncRouter } from "../middleware/asyncRouter";
import express, { Response } from "express";
import bcrypt from "bcryptjs";
import { loginIpLimiter, loginAccountLimiter, registrationLimiter } from "../middleware/loginLimits";
import { pool } from "../models/db";
import { registerUser, loginUser } from "../controllers/users";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";

const router = asyncRouter();

router.post("/register", registrationLimiter, registerUser);
router.post("/login", loginIpLimiter, loginAccountLimiter, loginUser);

router.get("/me",verifyToken,async(req:AuthRequest,res:Response)=>{
  const member=await findMember(req.user!.id,req.user!);
  if(!member)return res.status(404).json({message:"Miembro no encontrado"});
  res.json(member);
});
router.get("/organizations",verifyToken,isAdmin,async(_req,res:Response)=>{
  const result=await pool.query("SELECT DISTINCT grade FROM students WHERE grade IS NOT NULL AND grade<>'' ORDER BY grade");
  res.json(result.rows.map(row=>row.grade));
});
router.get("/members",verifyToken,async(req:AuthRequest,res:Response)=>res.json(await listMembers(req)));
router.get("/:id/academic",verifyToken,async(req:AuthRequest,res:Response)=>{
  const details=await academicDetails(positiveId(req.params.id),req.user!);
  if(!details)return res.status(404).json({message:"Miembro no encontrado"});
  res.json(details);
});

router.put("/me/password", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Se requieren ambas contraseñas" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
    }
    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user?.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Miembro no encontrado" });
    }
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user?.id]);
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch {
    res.status(500).json({ message: "Error actualizando contraseña" });
  }
});

router.get("/",verifyToken,isAdmin,async(req:AuthRequest,res:Response)=>{
  const result=await pool.query(memberSelect+" ORDER BY u.name,u.id",[req.user!.role,req.user!.id]);res.json(result.rows);
});
router.post("/",verifyToken,isAdmin,async(req:AuthRequest,res:Response)=>{
  const input=memberInput(req.body,true);
  const hashed=await bcrypt.hash(input.password,10);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const created=await client.query("INSERT INTO users(name,email,password,telefono,role,document) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[input.name,input.email,hashed,input.telefono,input.role,input.document]);
    const id=created.rows[0].id;
    await saveProfiles(client,id,input);
    const member=await findMember(id,req.user!,client);
    await client.query("COMMIT");res.status(201).json({user:member});
  }catch(error:any){await client.query("ROLLBACK");if(error.code==='23505')return res.status(409).json({message:"El correo o documento ya está registrado"});throw error;}finally{client.release();}
});
router.put("/:id",verifyToken,isAdmin,async(req:AuthRequest,res:Response)=>{
  const id=positiveId(req.params.id),input=memberInput(req.body,false);
  const hashed=input.password?await bcrypt.hash(input.password,10):null;
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await prepareRoleChange(client,id,input.role);
    await client.query(`UPDATE users SET name=$1,email=$2,telefono=$3,role=$4::varchar,document=$5,
      password=COALESCE($6,password),auth_version=auth_version+CASE WHEN role<>$4::varchar OR $6::text IS NOT NULL THEN 1 ELSE 0 END
      WHERE id=$7`,[input.name,input.email,input.telefono,input.role,input.document,hashed,id]);
    await saveProfiles(client,id,input);
    const member=await findMember(id,req.user!,client);
    await client.query("COMMIT");res.json(member);
  }catch(error:any){await client.query("ROLLBACK");if(error.code==='23505')return res.status(409).json({message:"El correo o documento ya está registrado"});throw error;}finally{client.release();}
});
router.delete("/:id/student-profile",verifyToken,isAdmin,async(req:AuthRequest,res:Response)=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");await removeStudentProfile(client,positiveId(req.params.id));await client.query("COMMIT");
    res.json({message:"Registro académico retirado; la cuenta se conserva"});
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
});
router.delete("/:id",verifyToken,isAdmin,async(req:AuthRequest,res:Response)=>{
  const id=positiveId(req.params.id),client=await pool.connect();
  try{
    await client.query("BEGIN");
    const user=await client.query("SELECT role FROM users WHERE id=$1 FOR UPDATE",[id]);
    if(!user.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Miembro no encontrado"});}
    if(id===req.user!.id){await client.query("ROLLBACK");return res.status(409).json({message:"No puedes eliminar tu propia cuenta desde Miembros"});}
    const student=await client.query("SELECT id FROM students WHERE user_id=$1 FOR UPDATE",[id]);
    if(student.rowCount&&await hasAcademicHistory(client,student.rows[0].id)){
      await client.query("ROLLBACK");return res.status(409).json({message:"El miembro tiene historial académico. Sus datos deben conservarse."});
    }
    await client.query("SELECT id FROM teachers WHERE user_id=$1 FOR UPDATE",[id]);
    const references=await client.query(`SELECT 1 WHERE
      EXISTS(SELECT 1 FROM courses c JOIN teachers t ON t.id=c.teacher_id WHERE t.user_id=$1)
      OR EXISTS(SELECT 1 FROM temple_attendance WHERE user_id=$1)
      OR EXISTS(SELECT 1 FROM financial_events WHERE actor_id=$1)
      OR EXISTS(SELECT 1 FROM meetings WHERE created_by=$1)
      OR EXISTS(SELECT 1 FROM meeting_attendees WHERE user_id=$1)
      OR EXISTS(SELECT 1 FROM speakers WHERE member_id=$1)
      OR EXISTS(SELECT 1 FROM activity_plans WHERE assigned_to=$1)`,[id]);
    if(references.rowCount){await client.query("ROLLBACK");return res.status(409).json({message:"El miembro tiene cursos o historial asociado. Reasigna sus responsabilidades y conserva los registros históricos."});}
    await client.query("DELETE FROM students WHERE user_id=$1",[id]);
    await client.query("DELETE FROM teachers WHERE user_id=$1",[id]);
    await client.query("DELETE FROM users WHERE id=$1",[id]);
    await client.query("COMMIT");res.json({message:"Miembro eliminado"});
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
});
export default router;
