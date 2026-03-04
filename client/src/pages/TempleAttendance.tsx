import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

interface User {
    id: number;
    name: string;
}

interface Trip {
    id: number;
    temple_name: string;
    date: string;
    cost: number;
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

const API_BASE_URL = import.meta.env.VITE_API_URL;

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
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
            register_date: res.register_date,
            advance_payment: res.advance_payment.toString(),
            pending_payment: res.pending_payment.toString(),
            due_date: res.due_date || ""
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

    const totalPages = Math.ceil(filteredReservations.length / recordsPerPage);

    const currentRecords = useMemo(() => {
        const lastIdx = currentPage * recordsPerPage;
        const firstIdx = lastIdx - recordsPerPage;
        return filteredReservations.slice(firstIdx, lastIdx);
    }, [filteredReservations, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

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
                        {trips.map(trip => (
                            <option key={trip.id} value={trip.id}>
                                {trip.temple_name} - {new Date(trip.date).toLocaleDateString("es-AR")}
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
                    <input id="pending_payment" type="number" name="pending_payment" value={formData.pending_payment} readOnly />
                </div>

                <div className="form-group">
                    <label htmlFor="due_date">Fecha de Vencimiento</label>
                    <input id="due_date" type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
                </div>

                <div className="form-group full-width">
                    <button type="submit" className="btn primary">{editingId ? "Actualizar" : "Registrar"}</button>
                </div>
            </form>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                backgroundColor: '#f9f9f9',
                padding: '10px 15px',
                borderRadius: '8px',
                flexWrap: 'wrap'
            }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label htmlFor="filterTrip">
                        Filtrar por viaje:
                    </label>
                    <select
                        id="filterTrip"
                        value={filterTripId}
                        onChange={e => { setFilterTripId(e.target.value); setCurrentPage(1); }}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: '1px solid #ccc',
                            outline: 'none'
                        }}
                    >
                        <option value="">Todos los viajes</option>
                        {trips.map(trip => (
                            <option key={trip.id} value={trip.id}>
                                {trip.temple_name} - {new Date(trip.date).toLocaleDateString("es-AR")}
                            </option>
                        ))}
                    </select>
                </div>

                {filterTripId && (
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#555', fontWeight: '500' }}>
                        📍 Miembros que asistieron: <strong>{filteredReservations.length}</strong>
                    </p>
                )}
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Miembro</th>
                            <th>Viaje</th>
                            <th>Registro</th>
                            <th>Adelanto</th>
                            <th>Pendiente</th>
                            <th>Vencimiento</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.map(res => (
                            <tr key={res.id}>
                                <td>{res.user_name}</td>
                                <td>{res.trip_date?.split("T")[0]}</td>
                                <td>{res.register_date?.split("T")[0]}</td>
                                <td>${Number(res.advance_payment).toLocaleString()}</td>
                                <td>${Number(res.pending_payment).toLocaleString()}</td>
                                <td>{res.due_date ? res.due_date.split("T")[0] : "-"}</td>
                                <td>
                                    <button onClick={() => handleEdit(res)}>✏️</button>
                                    <button onClick={() => handleDelete(res.id)}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={currentPage === i + 1 ? "active" : ""}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
