import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { usePagedList } from "../hooks/usePagedList";
import { invalidarCache } from "../utils/clienteCache";
import { limpiarSesion } from "../utils/sesion";
import type { Member } from "../interfaces/User";
import { MEMBER_ROLES } from "../interfaces/User";
import MemberEditor from "../components/members/MemberEditor";
import type { MemberForm } from "../components/members/MemberEditor";
import MemberDetails from "../components/members/MemberDetails";
import "../styles/Miembros.css";
import { IoSearchOutline, IoAddOutline, IoEyeOutline, IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import MemberModal from "../components/members/MemberModal";
export default function Miembros() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [me, setMe] = useState<Member | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
    const [search, setSearch] = useState(""), [roleFilter, setRoleFilter] = useState(""), [profileFilter, setProfileFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1), [sort, setSort] = useState({ key: "name", direction: "asc" });
    const [editorOpen, setEditorOpen] = useState(false), [editing, setEditing] = useState<Member | null>(null), [selected, setSelected] = useState<number | null>(null), [revision, setRevision] = useState(0);
    const [password, setPassword] = useState({ current: "", next: "", confirm: "" }), [passwordBusy, setPasswordBusy] = useState(false);
    const admin = me?.role === 'admin', profileView = me?.role === 'student' || searchParams.get('view') === 'profile';
    const directory = usePagedList<Member>("/users/members", { page: currentPage, limit: 10, search: search || undefined, role: roleFilter || undefined, profile: profileFilter || undefined, sort: sort.key, direction: sort.direction }, !!me && !profileView);
    useEffect(() => { let active = true; const controller = new AbortController(); api.get('/users/me', { signal: controller.signal }).then(({ data }) => { if (active) { setMe(data); localStorage.setItem('user', JSON.stringify(data)); } }).catch(() => { if (active) setError('No se pudo cargar la cuenta'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; controller.abort(); }; }, []);

    const totalPages = Math.max(1, Math.ceil(directory.total / 10));
    useEffect(() => { if (directory.loaded && !directory.loading && currentPage > totalPages) setCurrentPage(totalPages); }, [directory.loaded, directory.loading, currentPage, totalPages]);
    function changed() { invalidarCache(); directory.refresh(); setRevision(value => value + 1); }
    function filter(setter: (value: string) => void, value: string) { setter(value); setCurrentPage(1); }
    function requestSort(key: string) { setSort(previous => ({ key, direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc' })); setCurrentPage(1); }
    async function save(data: MemberForm) {
        const response = editing ? await api.put(`/users/${editing.id}`, data) : await api.post('/users', data);
        const member: Member = editing ? response.data : response.data.user;
        if (member.id === me?.id) { setMe(member); localStorage.setItem('user', JSON.stringify(member)); }
        setEditorOpen(false); setEditing(null); changed();
    }
    async function removeMember(member: Member) { if (!window.confirm(`¿Eliminar la cuenta de ${member.name}? Solo se permite si no tiene historial ni responsabilidades asociadas.`)) return; try { await api.delete(`/users/${member.id}`); if (selected === member.id) setSelected(null); changed(); } catch (error: any) { setError(error.response?.data?.message || 'No se pudo eliminar el miembro'); } }
    async function removeStudent() { if (!editing) return; await api.delete(`/users/${editing.id}/student-profile`); setEditorOpen(false); setEditing(null); changed(); }
    async function changePassword(event: React.FormEvent) { event.preventDefault(); setError(''); if (password.next !== password.confirm) { setError('Las contraseñas nuevas no coinciden'); return; } setPasswordBusy(true); try { await api.put('/users/me/password', { currentPassword: password.current, newPassword: password.next }); invalidarCache(); await limpiarSesion(); window.location.assign('/iniciar-sesion'); } catch (error: any) { setError(error.response?.data?.message || 'No se pudo cambiar la contraseña'); } finally { setPasswordBusy(false); } }
    if (loading) return <p role="status">Cargando miembros...</p>;
    if (!me) return <p role="alert">{error || 'No hay una sesión válida'}</p>;
    return <div className="miembros-page"><header className="miembros-header"><div><h1>{profileView ? 'Mi perfil' : admin ? 'Miembros' : 'Estudiantes de mis cursos'}</h1><p>{profileView ? 'Información personal y seguimiento académico' : 'Consulta y gestiona la información personal y académica.'}</p></div>
        {me.role !== 'student' && <div className="miembros-actions"><button className="btn secondary" onClick={() => { setSearchParams(profileView ? {} : { view: 'profile' }); setEditorOpen(false); setSelected(null); }}>{profileView ? 'Volver a miembros' : 'Mi perfil'}</button>
            {admin && !profileView && <button className="btn primary" onClick={() => { setEditing(null); setEditorOpen(true); }}><IoAddOutline aria-hidden="true" /> Registrar</button>}</div>}</header>
        {error && <p role="alert">{error}</p>}
        {profileView ? <>
            <MemberDetails id={me.id} viewerId={me.id} viewerRole={me.role} revision={revision} />
            <section className="miembros-card"><h2>Cambiar contraseña</h2><form onSubmit={changePassword}><fieldset disabled={passwordBusy} className="miembros-fields miembros-password">
                <label>Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" required value={password.current} onChange={e => setPassword(previous => ({ ...previous, current: e.target.value }))} /></label>
                <label>Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" required minLength={6} value={password.next} onChange={e => setPassword(previous => ({ ...previous, next: e.target.value }))} /></label>
                <label>Confirmar nueva contraseña<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} value={password.confirm} onChange={e => setPassword(previous => ({ ...previous, confirm: e.target.value }))} /></label>
                <button className="btn primary" type="submit">{passwordBusy ? 'Guardando...' : 'Actualizar contraseña'}</button>
            </fieldset></form></section>
        </> : <>
            {admin && editorOpen && <MemberEditor key={editing?.id || 'new'} member={editing} onSave={save} onCancel={() => { setEditorOpen(false); setEditing(null); }} onRemoveStudent={removeStudent} />}
            <div className="miembros-toolbar"><label className="miembros-search"><IoSearchOutline aria-hidden="true" /><input aria-label="Buscar miembros" type="search" name="member_search" placeholder="Buscar miembros..." value={search} onChange={e => filter(setSearch, e.target.value)} /></label>
                {admin && <div className="miembros-filters"><select aria-label="Rol de acceso" name="role_filter" value={roleFilter} onChange={e => filter(setRoleFilter, e.target.value)}><option value="">Todos los roles</option>{Object.entries(MEMBER_ROLES).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select>
                    <select aria-label="Tipo de registro" name="profile_filter" value={profileFilter} onChange={e => filter(setProfileFilter, e.target.value)}><option value="">Todos los registros</option><option value="student">Estudiantes</option><option value="teacher">Docentes</option></select></div>}
            </div>
            {directory.error && <p role="alert">{directory.error}</p>}{directory.loading && <p role="status">Actualizando miembros...</p>}
            <p className="miembros-count">{directory.total} miembros encontrados</p>
            <div className="table-container"><table><thead><tr>
                <th><button className="miembros-sort" type="button" onClick={() => requestSort('name')}>Nombre</button></th><th>Documento</th><th><button className="miembros-sort" type="button" onClick={() => requestSort('grade')}>Organización</button></th><th>Acciones</th>
            </tr></thead><tbody>{directory.items.map(member => <tr key={member.id}>
                <td><button type="button" className="miembros-name" onClick={() => setSelected(member.id)}>{member.name}</button></td><td>{member.document || '—'}</td><td>{member.grade || '—'}</td>
                <td><div className="miembros-row-actions"><button type="button" className="btn secondary" title="Ver ficha" onClick={() => setSelected(member.id)} aria-label={`Ver ficha de ${member.name}`}><IoEyeOutline aria-hidden="true" /></button>
                    {admin && <><button type="button" className="btn secondary" title="Editar" onClick={() => { setEditing(member); setEditorOpen(true); }} aria-label={`Editar ${member.name}`}><IoCreateOutline aria-hidden="true" /></button><button type="button" className="btn miembros-delete" title="Eliminar" disabled={member.id === me.id} onClick={() => removeMember(member)} aria-label={`Eliminar ${member.name}`}><IoTrashOutline aria-hidden="true" /></button></>}
                </div></td></tr>)}</tbody></table></div>
            {!directory.loading && !directory.items.length && <p>No hay miembros para los filtros seleccionados.</p>}
            {totalPages > 1 && <nav className="pagination-dropdown" aria-label="Paginación de miembros"><span>PÁGINA:</span><select aria-label="Página de miembros" value={currentPage} onChange={e => setCurrentPage(Number(e.target.value))}>{Array.from({ length: totalPages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} de {totalPages}</option>)}</select></nav>}
            {selected !== null && <MemberModal onClose={() => setSelected(null)}><MemberDetails key={selected} id={selected} viewerId={me.id} viewerRole={me.role} revision={revision} /></MemberModal>}
        </>}
    </div>;
}
