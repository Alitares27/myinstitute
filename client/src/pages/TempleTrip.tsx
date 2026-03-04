import { useEffect, useState } from "react";

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

const API_BASE_URL = import.meta.env.VITE_API_URL;

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

    const indexOfLastTrip = currentPage * tripsPerPage;
    const indexOfFirstTrip = indexOfLastTrip - tripsPerPage;
    const currentTrips = trips.slice(indexOfFirstTrip, indexOfLastTrip);
    const totalPages = Math.ceil(trips.length / tripsPerPage);

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
            date: trip.date,
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
                            <th>Templo</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Costo</th>
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
                                   <td>{trip.date?.split("T")[0]}</td>
                                    <td>{trip.status}</td>
                                    <td>${Number(trip.cost).toLocaleString()}</td>
                                    <td>
                                        <button
                                            className="btn secondary"
                                            onClick={() => handleEdit(trip)}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ backgroundColor: "var(--danger)", color: "white" }}
                                            onClick={() => handleDelete(trip.id)}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div style={{ marginTop: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
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
