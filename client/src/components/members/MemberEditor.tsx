import { confirmAppAction } from "../AppDialogHost";
import { IoPersonAddOutline, IoCreateOutline, IoCloseOutline, IoSaveOutline } from "react-icons/io5";
import { useState } from "react";
import type { Member, MemberRole } from "../../interfaces/User";
import { MEMBER_ROLES } from "../../interfaces/User";
import { businessDate } from "../../utils/utilidadesFecha";
const ORGANIZATIONS = ["Estaca", "M. Jovenes", "Q. Elderes", "S. Aaronico", "Soc. Soc.", "B. Independencia", "B. Las  Delicias", "B. San Martin", "B. Saladillo", "B. Urquiza", "B. VGG"];

export interface MemberForm {
    name: string; email: string; telefono: string; document: string; role: MemberRole; password: string;
    grade: string; specialty: string; student_enrollment_date: string; include_student_profile: boolean;
}
export default function MemberEditor({ member, onSave, onCancel, onRemoveStudent }: { member: Member | null; onSave: (data: MemberForm) => Promise<void>; onCancel: () => void; onRemoveStudent?: () => Promise<void> }) {
    const [form, setForm] = useState<MemberForm>({ name: member?.name || "", email: member?.email || "", telefono: member?.telefono || "", document: member?.document || "", role: member?.role || "student", password: "", grade: member?.grade || "", specialty: member?.specialty || "", student_enrollment_date: member ? (member.student_enrollment_date?.slice(0, 10) || "") : businessDate(), include_student_profile: !!member?.student_id });
    const [saving, setSaving] = useState(false), [error, setError] = useState("");
    const academic = form.role === 'student' || !!member?.student_id || form.include_student_profile;
    const set = (key: keyof MemberForm, value: string | boolean) => setForm(previous => ({ ...previous, [key]: value }));
    async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await onSave({ ...form, include_student_profile: academic }); } catch (error: any) { setError(error.response?.data?.message || "No se pudo guardar el miembro"); } finally { setSaving(false); } }
    async function remove() { if (!onRemoveStudent || !await confirmAppAction("¿Quitar solo el registro de estudiante? La cuenta se conserva. No se permite si hay matrículas, asistencias o notas.")) return; setSaving(true); setError(""); try { await onRemoveStudent(); } catch (error: any) { setError(error.response?.data?.message || "No se pudo retirar el registro académico"); } finally { setSaving(false); } }
    return <section className="miembros-card" aria-label="Formulario de miembro"><div className="miembros-form-header"><h2>{member ? <IoCreateOutline aria-hidden="true" /> : <IoPersonAddOutline aria-hidden="true" />}{member ? "Editar" : "Registrar"}</h2><button type="button" className="btn cancel-btn" onClick={onCancel} aria-label="Cerrar formulario" title="Cerrar formulario" disabled={saving}><IoCloseOutline aria-hidden="true" /></button></div>
        <form onSubmit={submit}><fieldset disabled={saving} className="miembros-fields"><div className="miembros-form-grid">
            <label>Nombre completo<input name="name" required maxLength={100} value={form.name} onChange={e => set('name', e.target.value)} /></label>
            <label>Correo electrónico<input name="email" type="email" required maxLength={150} value={form.email} onChange={e => set('email', e.target.value)} /></label>
            <label>Teléfono<input name="telefono" type="tel" maxLength={30} value={form.telefono} onChange={e => set('telefono', e.target.value)} /></label>
            <label>Documento<input name="document" inputMode="numeric" pattern="[0-9]*" maxLength={19} value={form.document} onChange={e => set('document', e.target.value)} /></label>
            <label>{member ? "Nueva contraseña (dejar vacía para conservarla)" : "Contraseña"}<input name="password" type="password" required={!member} minLength={6} autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} /></label>
            <label>Rol de acceso<select name="role" value={form.role} onChange={e => set('role', e.target.value)}>{Object.entries(MEMBER_ROLES).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select></label>
            <label className="miembros-checkbox"><input type="checkbox" name="include_student_profile" checked={academic} disabled={form.role === 'student' || !!member?.student_id} onChange={e => set('include_student_profile', e.target.checked)} /> Registro de estudiante</label>
            {academic && <><label>Organización<select name="grade" value={form.grade} onChange={e => set('grade', e.target.value)}><option value="">Seleccionar organización</option>{member?.grade && !ORGANIZATIONS.includes(member.grade) && <option value={member.grade} disabled>{member.grade} (actual)</option>}{ORGANIZATIONS.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
                <label>Fecha de alta como estudiante<input name="student_enrollment_date" type="date" value={form.student_enrollment_date} onChange={e => set('student_enrollment_date', e.target.value)} /></label></>}
            {(form.role === 'teacher' || member?.teacher_id) && <label>Especialidad del docente<input name="specialty" maxLength={100} value={form.specialty} onChange={e => set('specialty', e.target.value)} /></label>}
        </div>
            {error && <p role="alert">{error}</p>}
            <div className="miembros-form-actions"><button className="btn primary" type="submit"><IoSaveOutline aria-hidden="true" />{saving ? "Guardando..." : "Guardar"}</button>
                <button className="btn secondary" type="button" onClick={onCancel}>Cancelar</button>
                {member?.student_id && member.role !== 'student' && onRemoveStudent && <button className="btn miembros-delete" type="button" onClick={remove}>Quitar registro de estudiante</button>}
            </div></fieldset></form></section>;
}
