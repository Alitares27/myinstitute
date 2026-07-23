import { useEffect, useRef, useState } from "react";
import { getUsers, User } from "../../services/users";
import { AttendeeRequest, AttendeeStatus } from "../../interfaces/Meeting";
import { TbCheck } from "react-icons/tb";

interface Props {
    selectedAttendees: AttendeeRequest[];
    onChange: (attendees: AttendeeRequest[]) => void;
}

const STATUS_LABELS: Record<AttendeeStatus, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    declined: "Rechazado",
};

const STATUS_OPTIONS: AttendeeStatus[] = ["pending", "confirmed", "declined"];

export default function AttendeesSelector({
    selectedAttendees,
    onChange,
}: Props) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function loadUsers() {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error cargando usuarios:", error);
        } finally {
            setLoading(false);
        }
    }

    function toggleUser(userId: number) {
        const existing = selectedAttendees.find((a) => a.id === userId);
        if (existing) {
            onChange(selectedAttendees.filter((a) => a.id !== userId));
        } else {
            onChange([...selectedAttendees, { id: userId, status: "pending" }]);
        }
    }

    function removeUser(userId: number, e: React.MouseEvent) {
        e.stopPropagation();
        onChange(selectedAttendees.filter((a) => a.id !== userId));
    }

    function changeStatus(userId: number, status: AttendeeStatus) {
        onChange(
            selectedAttendees.map((a) =>
                a.id === userId ? { ...a, status } : a
            )
        );
    }

    const selectedIds = selectedAttendees.map((a) => a.id);
    const selectedUsers = users.filter((u) => selectedIds.includes(u.id));
    const filteredUsers = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <p>Cargando participantes...</p>;
    }

    return (
        <div className="attendees-selector" ref={dropdownRef}>
            <h3>Participantes</h3>

            {users.length === 0 ? (
                <p>No hay usuarios registrados.</p>
            ) : (
                <div className="attendees-dropdown">
                    <div
                        className="attendees-dropdown-trigger"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {selectedUsers.length === 0 ? (
                            <span className="attendees-placeholder">Seleccionar participantes...</span>
                        ) : (
                            <div className="attendees-chips">
                                {selectedUsers.map((user) => {
                                    const attendee = selectedAttendees.find((a) => a.id === user.id)!;
                                    return (
                                        <span key={user.id} className={`attendee-chip chip-${attendee.status}`}>
                                            {user.name}
                                            <button
                                                type="button"
                                                className="attendee-chip-remove"
                                                onClick={(e) => removeUser(user.id, e)}
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        <span className={`attendees-arrow ${isOpen ? "open" : ""}`}>&#9662;</span>
                    </div>

                    {isOpen && (
                        <div className="attendees-dropdown-menu">
                            <input
                                type="text"
                                className="attendees-search"
                                placeholder="Buscar usuario..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="attendees-dropdown-list">
                                {filteredUsers.length === 0 ? (
                                    <p className="attendees-no-results">Sin resultados</p>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const isSelected = selectedIds.includes(user.id);
                                        return (
                                            <div
                                                key={user.id}
                                                className={`attendee-option ${isSelected ? "selected" : ""}`}
                                                onClick={() => toggleUser(user.id)}
                                            >
                                                <span className="attendee-option-check">
                                                    {isSelected ? <TbCheck /> : ""}
                                                </span>
                                                <span>{user.name}</span>
                                                <small className="attendee-option-role">
                                                    ({user.role})
                                                </small>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedUsers.length > 0 && (
                <div className="attendees-status-list">
                    <h4>Estado de confirmación</h4>
                    {selectedUsers.map((user) => {
                        const attendee = selectedAttendees.find((a) => a.id === user.id)!;
                        return (
                            <div key={user.id} className="attendee-status-row">
                                <span className="attendee-status-name">{user.name}</span>
                                <select
                                    className={`attendee-status-select status-${attendee.status}`}
                                    value={attendee.status}
                                    onChange={(e) =>
                                        changeStatus(user.id, e.target.value as AttendeeStatus)
                                    }
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {STATUS_LABELS[s]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}