import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { IoCreateOutline, IoTrashOutline } from "react-icons/io5";
import { FiTruck } from "react-icons/fi";
import { TbPlus } from "react-icons/tb";
import { formatDate, toYMD } from "../utils/utilidadesFecha";
import { Skeleton } from "../components/Esqueleto";
import type { Temple } from "../interfaces/Common";
import type { Trip } from "../interfaces/Trip";

export default function TempleTrip() {

    const [temples, setTemples] = useState<Temple[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const [role, setRole] = useState<string>("");

    const [formData, setFormData] = useState({
        temple_id: "",
        date: "",
        status: "programado",
        cost: ""
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

    const [loading, setLoading] = useState(true);

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
            let aVal: any = a[sortConfig.key as keyof Trip];
            let bVal: any = b[sortConfig.key as keyof Trip];

            if (sortConfig.key === "cost") {
                aVal = Number(aVal);
                bVal = Number(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [trips, sortConfig]);

    const totalPages = Math.ceil(sortedTrips.length / recordsPerPage);

    const currentTrips = useMemo(() => {
        const lastIdx = currentPage * recordsPerPage;
        const firstIdx = lastIdx - recordsPerPage;
        return sortedTrips.slice(firstIdx, lastIdx);
    }, [sortedTrips, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        setRole(user.role || "");

        Promise.all([
            api.get("/temples"),
            api.get("/temple-trips"),
        ])
            .then(([templesRes, tripsRes]) => {
                setTemples(templesRes.data);
                setTrips(tripsRes.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
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
                await api.put(`/temple-trips/${editingId}`, formData);
            } else {
                await api.post("/temple-trips", formData);
            }

            const res = await api.get("/temple-trips");
            setTrips(res.data);
            setEditingId(null);

            setFormData({
                temple_id: "",
                date: "",
                status: "programado",
                cost: ""
            });

        } catch {
        }
    };

    const handleEdit = (trip: Trip) => {
        setFormData({
            temple_id: trip.temple_id?.toString() || "",
            date: toYMD(trip.date),
            status: trip.status || "programado",
            cost: trip.cost.toString()
        });
        setEditingId(trip.id);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Eliminar este viaje?")) return;
        try {
            await api.delete(`/temple-trips/${id}`);
            setTrips(prev => prev.filter(t => t.id !== id));
        } catch {
        }
    };

    const formatStatus = (status?: string) => {
        if (!status) return "";
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    if (loading) {
        return (
            <div>
                <Skeleton width="240px" height="1.8rem" />
                <Skeleton width="200px" height="1.1rem" style={{ marginTop: "8px" }} />
                <div style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ display: "flex", gap: "1rem" }}>
                                <Skeleton height="1rem" style={{ flex: 2 }} />
                                <Skeleton height="1rem" style={{ flex: 1 }} />
                                <Skeleton height="1rem" style={{ flex: 1 }} />
                                <Skeleton height="1rem" style={{ flex: 1 }} />
                                <Skeleton width="70px" height="1.8rem" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1><span className="page-title-icon"><FiTruck /></span> Gestionar Viajes</h1>
            <h2>{role === "admin" ? <><TbPlus /> Registrar Viaje</> : "Disponibles"}</h2>
            {role === "admin" && (
                <form onSubmit={handleSubmit} className="grid-form">
                    <div className="form-group">
                        <label>Templo</label>
                        <select
                            name="temple_id"
                            value={formData.temple_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Elegir templo</option>
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

                    <div className="form-group full-width">
                        <button type="submit" className="btn primary">
                            {editingId ? "Actualizar" : "Registrar"}
                        </button>
                        {(editingId !== null || formData.temple_id || formData.date || formData.cost) && (
                            <button type="button" onClick={() => { setEditingId(null); setFormData({ temple_id: "", date: "", status: "programado", cost: "" }); }} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>
                        )}
                    </div>
                </form>
            )}

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
                            {role === "admin" && <th>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {currentTrips.length === 0 ? (
                            <tr>
                                <td colSpan={role === "admin" ? 5 : 4}>No hay viajes registrados</td>
                            </tr>
                        ) : (
                            currentTrips.map(trip => (
                                <tr key={trip.id}>
                                    <td>{trip.temple_name}</td>
                                    <td>{formatDate(trip.date)}</td>
                                    <td><span className={`status-${trip.status}`}>{formatStatus(trip.status)}</span></td>
                                    <td>${Number(trip.cost).toLocaleString()}</td>
                                    {role === "admin" && (
                                        <td>
                                            <button
                                                className="btn secondary extracted-style-4"
                                                onClick={() => handleEdit(trip)}
                                                aria-label="Editar"
                                            >
                                                <IoCreateOutline />
                                            </button>
                                            <button
                                                className="btn secondary extracted-style-5"
                                                onClick={() => handleDelete(trip.id)}
                                                aria-label="Eliminar"
                                            >
                                                <IoTrashOutline />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className="pagination-dropdown">
                        <span>PAGINA:</span>
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
        </div>
    );
}
