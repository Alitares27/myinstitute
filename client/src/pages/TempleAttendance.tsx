import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import { formatDate, toYMD } from "../utils/dateUtils";

interface User {
    id: number;
    name: string;
}

interface Trip {
    id: number;
    temple_name: string;
    date: string;
    cost: number;
    status?: string;
}

interface Reservation {
    id: number;
    user_id: number;
    user_name: string;
    trip_id: number;
    trip_date: string;
    register_date: string;
    advance_payment: number;
    pending_payment: number;
    due_date: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TripReservations() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        user_id: "",
        trip_id: "",
        register_date: "",
        advance_payment: "",
        pending_payment: "",
        due_date: ""
    });

    const [filterTripId, setFilterTripId] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev?.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };

    useEffect(() => {
        const userRole = sessionStorage.getItem("role");
        setRole(userRole);

        if (!userRole || userRole !== "admin") {
            navigate("/", { replace: true });
            return;
        }
    }, [navigate]);

    const fetchUsers = async () => {
        const res = await fetch(`${API_BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        const data = await res.json();
        setUsers(data);
    };

    const fetchTrips = async () => {
        const res = await fetch(`${API_BASE_URL}/temple-trips`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        const data = await res.json();
        setTrips(data);
    };

    const fetchReservations = async () => {
        const res = await fetch(`${API_BASE_URL}/trip-reservations`, {
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        const data = await res.json();
        setReservations(data);
    };

    useEffect(() => {
        fetchUsers();
        fetchTrips();
        fetchReservations();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };

        const tripId = name === "trip_id" ? value : updated.trip_id;
        const advance = name === "advance_payment" ? value : updated.advance_payment;
        const selectedTrip = trips.find(t => t.id === Number(tripId));

        if (selectedTrip) {
            const cost = Number(selectedTrip.cost);
            const adv = Number(advance) || 0;
            updated.pending_payment = String(Math.max(0, cost - adv));
        } else if (!tripId) {
            updated.pending_payment = "";
        }

        setFormData(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedTrip = trips.find(trip => trip.id === Number(formData.trip_id));
        if (selectedTrip && Number(formData.advance_payment) > selectedTrip.cost) {
            alert("El adelanto no puede ser mayor que el costo del viaje");
            return;
        }

        if (editingId) {
            await fetch(`${API_BASE_URL}/trip-reservations/${editingId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                },
                body: JSON.stringify(formData)
            });
        } else {
            await fetch(`${API_BASE_URL}/trip-reservations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                },
                body: JSON.stringify(formData)
            });
        }

        setEditingId(null);
        setFormData({
            user_id: "",
            trip_id: "",
            register_date: "",
            advance_payment: "",
            pending_payment: "",
            due_date: ""
        });
        fetchReservations();
    };

    const handleEdit = (res: Reservation) => {
        setFormData({
            user_id: res.user_id.toString(),
            trip_id: res.trip_id.toString(),
            register_date: toYMD(res.register_date),
            advance_payment: res.advance_payment.toString(),
            pending_payment: res.pending_payment.toString(),
            due_date: toYMD(res.due_date)
        });
        setEditingId(res.id);
    };

    const handleDelete = async (id: number) => {
        await fetch(`${API_BASE_URL}/trip-reservations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        fetchReservations();
    };

    const filteredReservations = useMemo(() => {
        return filterTripId
            ? reservations.filter(r => r.trip_id === Number(filterTripId))
            : reservations;
    }, [reservations, filterTripId]);

    const sortedReservations = useMemo(() => {
        if (!sortConfig) return filteredReservations;
        return [...filteredReservations].sort((a, b) => {
            const aVal = a[sortConfig.key as keyof Reservation];
            const bVal = b[sortConfig.key as keyof Reservation];
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredReservations, sortConfig]);

    const totalPages = Math.ceil(sortedReservations.length / recordsPerPage);

    const currentRecords = useMemo(() => {
        const lastIdx = currentPage * recordsPerPage;
        const firstIdx = lastIdx - recordsPerPage;
        return sortedReservations.slice(firstIdx, lastIdx);
    }, [sortedReservations, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const availableTripsForReservation = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return trips.filter(trip => {
            const s = (trip.status || "").toLowerCase();
            const tripDate = new Date(trip.date);
            return s === "programado" && tripDate >= today;
        });
    }, [trips]);

    const handlePrintReport = () => {
        const tripCounts = reservations.reduce((acc, r) => {
            acc[r.user_id] = (acc[r.user_id] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        const groupedByDate = filteredReservations.reduce((acc, r) => {
            const dateStr = formatDate(r.trip_date);
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(r);
            return acc;
        }, {} as Record<string, Reservation[]>);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let html = `
            <html>
            <head>
                <title>Reporte de Viajes</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    h1 { text-align: center; color: #222; }
                    h2 { margin-top: 30px; border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #444; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f9f9f9; font-weight: bold; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                </style>
            </head>
            <body>
                <h1>Reporte de Asistencia a Viajes del Templo</h1>
        `;

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            return new Date(a).getTime() - new Date(b).getTime();
        });

        sortedDates.forEach(date => {
            html += `<h2>Fecha: ${date}</h2>`;
            html += `
                <table>
                    <thead>
                        <tr>
                            <th>Nombre del Miembro</th>
                            <th class="right">Adelanto</th>
                            <th class="right">Pendiente</th>
                            <th class="center">Total Viajes Realizados</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            groupedByDate[date].forEach(res => {
                html += `
                    <tr>
                        <td>${res.user_name}</td>
                        <td class="right">$${Number(res.advance_payment).toLocaleString()}</td>
                        <td class="right">$${Number(res.pending_payment).toLocaleString()}</td>
                        <td class="center">${tripCounts[res.user_id] || 1}</td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
        });

        html += `
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
        }, 200);
    };

    return (
        <div>
            <h1 className="dashboard-subtitle">🚌 Reservar Viajes</h1>
            <h2>  {role === "admin" ? "➕ Reservar" : "Disponibles"}</h2>
            <form onSubmit={handleSubmit} className="grid-form">
                <div className="form-group">
                    <label htmlFor="user_id">Estudiante</label>
                    <select id="user_id" name="user_id" value={formData.user_id} onChange={handleChange} required>
                        <option value="">Miembro</option>
                        {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="trip_id">Viaje</label>
                    <select id="trip_id" name="trip_id" value={formData.trip_id} onChange={handleChange} required>
                        <option value="">Viaje</option>
                        {availableTripsForReservation.map(trip => (
                            <option key={trip.id} value={trip.id}>
                                {formatDate(trip.date)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="register_date">Fecha de Registro</label>
                    <input id="register_date" type="date" name="register_date" value={formData.register_date} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label htmlFor="advance_payment">Adelanto</label>
                    <input id="advance_payment" type="number" name="advance_payment" placeholder="Ingrese adelanto" value={formData.advance_payment} onChange={handleChange} min="0" />
                </div>

                <div className="form-group">
                    <label htmlFor="pending_payment">Monto Pendiente</label>
                    <input
                        id="pending_payment"
                        type="text"
                        name="pending_payment"
                        value={
                            formData.pending_payment !== ""
                                ? `$${Number(formData.pending_payment).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : ""
                        }
                        readOnly
                        style={{ background: "var(--bg-body, #f5f5f5)", cursor: "not-allowed", opacity: 0.8 }}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="due_date">Fecha de Vencimiento</label>
                    <input id="due_date" type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
                </div>

                <div className="form-group full-width">
                    <button type="submit" className="btn primary">{editingId ? "Actualizar" : "Registrar"}</button>
                </div>
            </form>

            <div className="grid-form extracted-style-2" style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "center" }}>
                <div className="form-group extracted-style-8" style={{ flexWrap: "wrap" }}>
                    <label htmlFor="filterTrip" style={{ whiteSpace: "nowrap" }}>
                        Filtrar por viaje:
                    </label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <select
                            id="filterTrip"
                            value={filterTripId}
                            onChange={e => { setFilterTripId(e.target.value); setCurrentPage(1); }}
                            className="extracted-style-9"
                            style={{ flex: 1, minWidth: "200px" }}
                        >
                            <option value="">Todos los viajes</option>
                            {trips.map(trip => (
                                <option key={trip.id} value={trip.id}>
                                    {trip.temple_name} - {formatDate(trip.date)}
                                </option>
                            ))}
                        </select>
                        <button type="button" onClick={handlePrintReport} className="btn secondary" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                            🖨️ Imprimir Reporte
                        </button>
                    </div>
                </div>

                {filterTripId && (
                    <p className="extracted-style-10" style={{ whiteSpace: "nowrap" }}>
                        📍 Miembros que asisten: <strong>{filteredReservations.length}</strong>
                    </p>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort("user_name")} className="sortable-header">
                                Miembro
                                <span className="sort-icon">
                                    {sortConfig?.key === "user_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("trip_date")} className="sortable-header">
                                Viaje
                                <span className="sort-icon">
                                    {sortConfig?.key === "trip_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("register_date")} className="sortable-header">
                                Registro
                                <span className="sort-icon">
                                    {sortConfig?.key === "register_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("advance_payment")} className="sortable-header">
                                Adelanto
                                <span className="sort-icon">
                                    {sortConfig?.key === "advance_payment" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("pending_payment")} className="sortable-header">
                                Pendiente
                                <span className="sort-icon">
                                    {sortConfig?.key === "pending_payment" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("due_date")} className="sortable-header">
                                Vencimiento
                                <span className="sort-icon">
                                    {sortConfig?.key === "due_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.map(res => (
                            <tr key={res.id}>
                                <td>{res.user_name}</td>
                                <td>{formatDate(res.trip_date)}</td>
                                <td>{formatDate(res.register_date)}</td>
                                <td>${Number(res.advance_payment).toLocaleString()}</td>
                                <td>${Number(res.pending_payment).toLocaleString()}</td>
                                <td>{formatDate(res.due_date)}</td>
                                <td>
                                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(res)}><FaEdit /></button>
                                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(res.id)}><FaTrash /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination-dropdown">
                    <span>PÁGINA:</span>
                    <select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                    >
                        {Array.from({ length: totalPages }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
