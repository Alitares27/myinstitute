export interface User {
  id: number;
  name: string;
  email: string;
  telefono: string;
  role: string;
  document: string;
  specialty?: string;
  grade?: string;
}

export type MemberRole = "admin" | "teacher" | "student";
export interface Member {
  id:number;
  name:string;
  email:string;
  telefono:string|null;
  role:MemberRole;
  document:string|null;
  student_id:number|null;
  grade:string|null;
  student_enrollment_date:string|null;
  teacher_id:number|null;
  specialty:string|null;
  teacher_created_at:string|null;
}
export const MEMBER_ROLES:Record<MemberRole,string>={admin:"Administrador",teacher:"Docente / Líder",student:"Estudiante"};
