import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import api from "../../api";
import {MEMBER_ROLES} from "../../interfaces/User";
import type {Member} from "../../interfaces/User";
import {formatDate} from "../../utils/utilidadesFecha";
interface Details {member:Member;courses:{course_id:number;title:string;teacher_name:string|null;enrollment_date:string|null}[];summary:{courses:number;present:number;absent:number;average_grade:number|null}|null;}
export default function MemberDetails({id,viewerId,viewerRole,revision=0,onClose}:{id:number;viewerId:number;viewerRole:string;revision?:number;onClose?:()=>void}){
 const [details,setDetails]=useState<Details|null>(null),[error,setError]=useState("");
 useEffect(()=>{
  let active=true;const controller=new AbortController();setDetails(null);setError("");
  api.get(`/users/${id}/academic`,{signal:controller.signal}).then(({data})=>{if(active)setDetails(data);}).catch(()=>{if(active&&!controller.signal.aborted)setError("No se pudo consultar la ficha académica");});
  return()=>{active=false;controller.abort();};
 },[id,revision]);
 return <section className="miembros-card miembros-details" aria-label="Ficha de miembro">
  {onClose&&<button type="button" className="btn secondary" onClick={onClose}>Cerrar ficha</button>}
  {error?<p role="alert">{error}</p>:!details?<p role="status">Cargando ficha...</p>:<>
   <h2>{details.member.name}</h2><p>Correo electrónico: {details.member.email}</p><p>Rol de acceso: {MEMBER_ROLES[details.member.role]}</p>
   {details.member.telefono&&<p>Teléfono: {details.member.telefono}</p>}
   {details.member.document&&<p>Documento: {details.member.document}</p>}
   {details.member.teacher_id&&<p>Especialidad: {details.member.specialty||"Sin especificar"} · Alta como docente: {formatDate(details.member.teacher_created_at)}</p>}
   {details.member.student_id?<>
    <h3>Registro de estudiante</h3><p>Organización: {details.member.grade||"Sin especificar"}</p><p>Fecha de alta: {formatDate(details.member.student_enrollment_date)}</p>
    <h3>{viewerRole==='teacher'&&viewerId!==id?"Resumen de tus cursos":"Resumen académico"}</h3>
    <p>Cursos: {details.summary?.courses||0} · Presentes: {details.summary?.present||0} · Ausentes: {details.summary?.absent||0} · Promedio: {details.summary?.average_grade==null?"Sin notas":Number(details.summary.average_grade).toFixed(2)}</p>
    <nav className="miembros-academic-links" aria-label="Seguimiento académico"><Link to={`/inscripciones?student_id=${details.member.student_id}`}>Matrículas</Link><Link to={`/asistencia?student_id=${details.member.student_id}`}>Asistencia</Link><Link to={`/calificaciones?student_id=${details.member.student_id}`}>Calificaciones</Link></nav>
    {details.courses.length?<div className="table-container"><table><thead><tr><th>Curso</th><th>Docente</th><th>Fecha de matrícula</th></tr></thead><tbody>{details.courses.map(course=><tr key={course.course_id}><td>{course.title}</td><td>{course.teacher_name||"Sin asignar"}</td><td>{formatDate(course.enrollment_date)}</td></tr>)}</tbody></table></div>:<p>No hay matrículas para mostrar.</p>}
   </>:<p>Este miembro no tiene registro de estudiante.</p>}
  </>}
 </section>;
}
