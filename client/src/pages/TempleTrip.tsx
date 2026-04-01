import { useEffect, useState, useMemo } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { formatDate, toYMD } from "../utils/dateUtils";

interface Temple {
    id: number;
    name: string;
}

interface Trip {
    id: number;
    temple_id: number;
    temple_name: string;
    date: string;
    status: string;
    cost: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TempleTrip() {

    const [temples, setTemples] = useState<Temple[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const tripsPerPage = 5;
    const role = sessionStorage.getItem("role");

    const [formData, setFormData] = useState({
        temple_id: "",
        date: "",
        status: "programado",
        cost: ""
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev?.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" }
        );
    };

    const sortedTrips = useMemo(() => {
        if (!sortConfig) return trips;
        return [...trips].sort((a, b) => {
            const aVal = a[sortConfig.key as keyof Trip];
            const bVal = b[sortConfig.key as keyof Trip];
            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [trips, sortConfig]);

    const indexOfLastTrip = currentPage * tripsPerPage;
    const indexOfFirstTrip = indexOfLastTrip - tripsPerPage;
    const currentTrips = sortedTrips.slice(indexOfFirstTrip, indexOfLastTrip);
    const totalPages = Math.ceil(sortedTrips.length / tripsPerPage);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [trips]);

    const fetchTemples = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/temples`, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                }
            });

            if (!res.ok) throw new Error("Error al obtener templos");

            const data = await res.json();
            setTemples(data);
        } catch (error) {
            console.error("❌ Error cargando templos:", error);
        }
    };

    const fetchTrips = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/temple-trips`, {
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                }
            });

            if (!res.ok) throw new Error("Error al obtener viajes");

            const data = await res.json();
            setTrips(data);
        } catch (error) {
            console.error("❌ Error cargando viajes:", error);
        }
    };

    useEffect(() => {
        fetchTemples();
        fetchTrips();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingId) {
                await fetch(`${API_BASE_URL}/temple-trips/${editingId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`
                    },
                    body: JSON.stringify(formData)
                });
            } else {
                await fetch(`${API_BASE_URL}/temple-trips`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`
                    },
                    body: JSON.stringify(formData)
                });
            }

            fetchTrips();
            setEditingId(null);

            setFormData({
                temple_id: "",
                date: "",
                status: "programado",
                cost: ""
            });

        } catch (error) {
            console.error("❌ Error guardando viaje:", error);
        }
    };

    const handleEdit = (trip: Trip) => {
        setFormData({
            temple_id: trip.temple_id.toString(),
            date: toYMD(trip.date),
            status: trip.status,
            cost: trip.cost.toString()
        });
        setEditingId(trip.id);
    };

    const handleDelete = async (id: number) => {
        try {
            await fetch(`${API_BASE_URL}/temple-trips/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                }
            });

            fetchTrips();
        } catch (error) {
            console.error("❌ Error eliminando viaje:", error);
        }
    };

    return (
        <div>
            <h1 className="dashboard-subtitle">🚌 Gestionar Viajes</h1>
            <h2>{role === "admin" ? "➕ Registrar Viaje" : "Disponibles"}</h2>
            <form onSubmit={handleSubmit} className="grid-form">
                <div className="form-group">
                    <label>Templo</label>
                    <select
                        name="temple_id"
                        value={formData.temple_id}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Seleccione un templo</option>
                        {temples.map(temple => (
                            <option key={temple.id} value={temple.id}>
                                {temple.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Fecha</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Estado</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                    >
                        <option value="programado">Programado</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Costo</label>
                    <input
                        type="number"
                        name="cost"
                        value={formData.cost}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button type="submit" className="btn primary">
                    {editingId ? "Actualizar" : "Registrar"}
                </button>
            </form>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort("temple_name")} className="sortable-header">
                                Templo
                                <span className="sort-icon">
                                    {sortConfig?.key === "temple_name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("date")} className="sortable-header">
                                Fecha
                                <span className="sort-icon">
                                    {sortConfig?.key === "date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("status")} className="sortable-header">
                                Estado
                                <span className="sort-icon">
                                    {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("cost")} className="sortable-header">
                                Costo
                                <span className="sort-icon">
                                    {sortConfig?.key === "cost" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentTrips.length === 0 ? (
                            <tr>
                                <td colSpan={5}>No hay viajes registrados</td>
                            </tr>
                        ) : (
                            currentTrips.map(trip => (
                                <tr key={trip.id}>
                                    <td>{trip.temple_name}</td>
                                    <td>{formatDate(trip.date)}</td>
                                    <td><span className="status-general">{trip.status}</span></td>
                                    <td>${Number(trip.cost).toLocaleString()}</td>
                                    <td>
                                        <button
                                            className="btn secondary extracted-style-4"
                                            onClick={() => handleEdit(trip)}
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className="btn secondary extracted-style-5"
                                            onClick={() => handleDelete(trip.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="extracted-style-26">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            ⬅ Anterior
                        </button>

                        <span>
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente ➡
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
