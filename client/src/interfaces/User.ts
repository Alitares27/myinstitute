import type { AppModule } from "../shared/constants";

export interface User {
  id: number;
  name: string;
  email: string;
  telefono: string;
  role: MemberRole;
  permissions?: AppModule[];
  document: string;
  specialty?: string;
  grade?: string;
}

export type MemberRole = "admin" | "teacher" | "student" | "finance";
export interface Member {
  id:number;
  name:string;
  email:string;
  telefono:string|null;
  role:MemberRole;
  permissions?: AppModule[];
  document:string|null;
  student_id:number|null;
  grade:string|null;
  student_enrollment_date:string|null;
  teacher_id:number|null;
  specialty:string|null;
  teacher_created_at:string|null;
}
export const MEMBER_ROLES:Record<MemberRole,string>={admin:"Admin",teacher:"Líder / Maestro",student:"Miembro",finance:"Financiero"};
