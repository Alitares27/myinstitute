import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline, IoCarOutline } from "react-icons/io5";
import { FiMapPin } from "react-icons/fi";
import { TbAlertTriangle } from "react-icons/tb";
import { formatDate, toYMD } from "../utils/dateUtils";
import { openPrintWindow } from "../utils/reportUtils";
import { Skeleton } from "../components/Skeleton";
import api from "../api";
import { TripStatus } from "../shared/constants";
import { Trip } from "../shared/types";
import useAvailableTrips from "../hooks/useAvailableTrips";
import type { BasicUser } from "../interfaces/Common";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000/api";

const getTodayYMD = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export default function TripReservations() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<BasicUser[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        user_id: "",
        trip_id: "",
        register_date: getTodayYMD(),
        advance_payment: "",
        pending_payment: "",
        due_date: ""
    });

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentError, setPaymentError] = useState<string>("");
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        trip_id: "",
        attendance_id: "",
        payment_amount: "",
        payment_date: getTodayYMD()
    });

    const [filterTripId, setFilterTripId] = useState<string>("");
    const [filterUserId, setFilterUserId] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showSummary, setShowSummary] = useState(false);
    const recordsPerPage = 5;
    const [loading, setLoading] = useState(true);

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
        const { data } = await api.get('/users');
        setUsers(data);
    };

    const fetchTrips = async () => {
        const { data } = await api.get('/temple-trips');
        setTrips(data);
    };

    const fetchReservations = async () => {
        const { data } = await api.get('/trip-reservations');
        setReservations(data);
    };

    useEffect(() => {
        Promise.all([fetchUsers(), fetchTrips(), fetchReservations()]).finally(() => setLoading(false));
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
            if (name === "trip_id") {
                const tripDateRaw = selectedTrip.date;
                updated.due_date = tripDateRaw ? tripDateRaw.substring(0, 10) : "";
            }
        } else if (!tripId) {
            updated.pending_payment = "";
            if (name === "trip_id") updated.due_date = "";
        }

        setFormData(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedTrip = trips.find(trip => trip.id === Number(formData.trip_id));
        if (selectedTrip && Number(formData.advance_payment) > selectedTrip.cost) {
            alert("El pago no puede ser mayor que el costo del viaje");
            return;
        }

        if (!editingId) {
            const duplicate = reservations.find(
                r => r.user_id === Number(formData.user_id) && r.trip_id === Number(formData.trip_id)
            );
            if (duplicate) {
                const memberName = users.find(u => u.id === Number(formData.user_id))?.name || "Este miembro";
                const tripDate = selectedTrip ? selectedTrip.date.substring(0, 10) : "";
                alert(`${memberName} ya tiene una reserva para el viaje del ${tripDate}.`);
                return;
            }
        }

        if (editingId) {
            await api.put(`/trip-reservations/${editingId}`, {
                ...formData,
                user_id: Number(formData.user_id),
                trip_id: Number(formData.trip_id),
                advance_payment: Number(formData.advance_payment),
                pending_payment: Number(formData.pending_payment)
            }).catch(() => { alert('Error al actualizar la reserva'); });
        } else {
            await api.post(`/trip-reservations`, {
                ...formData,
                user_id: Number(formData.user_id),
                trip_id: Number(formData.trip_id),
                advance_payment: Number(formData.advance_payment),
                pending_payment: Number(formData.pending_payment)
            }).catch(() => { alert('Error al crear la reserva'); });
        }

        setEditingId(null);
        setFormData({
            user_id: "",
            trip_id: "",
            register_date: getTodayYMD(),
            advance_payment: "",
            pending_payment: "",
            due_date: ""
        });
        fetchReservations();
    };

    const handleEdit = (res: any) => {
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

    const handleCancel = () => {
        setEditingId(null);
        setFormData({
            user_id: "",
            trip_id: "",
            register_date: getTodayYMD(),
            advance_payment: "",
            pending_payment: "",
            due_date: ""
        });
    };

    const isFormDirty = editingId !== null ||
        formData.user_id !== "" ||
        formData.trip_id !== "" ||
        formData.advance_payment !== "";

    const handleDelete = async (id: number) => {
        await api.delete(`/trip-reservations/${id}`)
            .catch(() => { alert('Error al eliminar la reserva'); });
        fetchReservations();
    };

    const availableTripsForReservation = useAvailableTrips(trips);

    const selectedReservationForPayment = reservations.find(
        r => r.id === Number(paymentForm.attendance_id)
    );

    const availableReservationsForSelectedTrip = useMemo(() => {
        if (!paymentForm.trip_id) return [];
        return reservations.filter(r => r.trip_id === Number(paymentForm.trip_id) && Number(r.pending_payment) > 0);
    }, [paymentForm.trip_id, reservations]);

    const handleOpenPaymentModal = () => {
        setPaymentError("");
        setPaymentForm({
            trip_id: "",
            attendance_id: "",
            payment_amount: "",
            payment_date: ""
        });
        setShowPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentError("");
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPaymentError("");

        const amount = Number(paymentForm.payment_amount);
        if (Number.isNaN(amount) || amount <= 0) {
            setPaymentError("Ingresa un monto válido mayor a cero");
            return;
        }

        setIsSubmittingPayment(true);

        try {
            await api.post(`/temple-amortizations`, {
                attendance_id: Number(paymentForm.attendance_id),
                payment_amount: amount,
                payment_date: paymentForm.payment_date
            });
            handleClosePaymentModal();
            fetchReservations();
        } catch (err: any) {
            setPaymentError(err.response?.data?.message || "Error al registrar el pago");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const membersWithReservations = useMemo(() => {
        const uniqueIds = new Set(reservations.map(r => r.user_id));
        return users.filter(u => uniqueIds.has(u.id));
    }, [reservations, users]);

    const availableMembersForSelectedTrip = useMemo(() => {
        if (!formData.trip_id) return users;
        const reservedUserIds = new Set(
            reservations
                .filter(r => r.trip_id === Number(formData.trip_id))
                .map(r => r.user_id)
        );
        return users.filter(u => !reservedUserIds.has(u.id));
    }, [reservations, users, formData.trip_id]);

    const filteredReservations = useMemo(() => {
        let result = reservations;
        if (filterTripId) result = result.filter(r => r.trip_id === Number(filterTripId));
        if (filterUserId) result = result.filter(r => r.user_id === Number(filterUserId));
        return result;
    }, [reservations, filterTripId, filterUserId]);

    const reservationTotals = useMemo(() => {
        return filteredReservations.reduce(
            (totals, reservation) => {
                totals.totalPaid += Number(reservation.advance_payment) || 0;
                totals.totalPending += Number(reservation.pending_payment) || 0;
                return totals;
            },
            { totalPaid: 0, totalPending: 0 }
        );
    }, [filteredReservations]);

    const sortedReservations = useMemo(() => {
        if (!sortConfig) return filteredReservations;
        return [...filteredReservations].sort((a, b) => {
            const aVal = (a as any)[sortConfig.key as string];
            const bVal = (b as any)[sortConfig.key as string];
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

    useEffect(() => {
        if (filterTripId || filterUserId) {
            setShowSummary(true);
        }
    }, [filterTripId, filterUserId]);

    const handlePrintReport = () => {
        const groupedByDate = filteredReservations.reduce((acc: Record<string, any[]>, r: any) => {
            const dateStr = formatDate(r.trip_date);
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(r);
            return acc;
        }, {} as Record<string, any[]>);

        const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
            new Date(a).getTime() - new Date(b).getTime()
        );

        let body = "";
        let totalRegistrados = 0;
        let totalPagado = 0;
        let totalPendiente = 0;

        sortedDates.forEach(date => {
            const dateGroup = groupedByDate[date];
            const sortedMembers = [...dateGroup].sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));

            totalRegistrados += dateGroup.length;
            dateGroup.forEach(r => {
                totalPagado += Number(r.advance_payment);
                totalPendiente += Number(r.pending_payment);
            });

            body += `<h2>Fecha de Viaje: ${date}</h2><table><thead><tr><th>Miembro</th><th>Documento</th><th>Pagado</th><th>Pendiente</th></tr></thead><tbody>`;
            sortedMembers.forEach(res => {
                body += `<tr><td>${res.user_name}</td><td>${res.user_document || "-"}</td><td>$${Number(res.advance_payment).toLocaleString()}</td><td>$${Number(res.pending_payment).toLocaleString()}</td></tr>`;
            });
            body += `</tbody></table>`;
        });

        body += `<div style="margin-top:24px;padding:16px 20px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;display:flex;gap:2rem;">
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Registrados</span><br><strong style="font-size:18px;">${totalRegistrados}</strong></div>
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Pagado</span><br><strong style="font-size:18px;">$${totalPagado.toLocaleString()}</strong></div>
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Pendiente</span><br><strong style="font-size:18px;">$${totalPendiente.toLocaleString()}</strong></div>
        </div>`;

        openPrintWindow("Reporte de Viajes al Templo", "Rama Arroyo Seco", body);
    };

    if (loading) {
        return (
            <div>
                <Skeleton width="240px" height="1.8rem" />
                <Skeleton width="200px" height="1.1rem" style={{ marginTop: "8px" }} />
                <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                    <Skeleton height="2.5rem" style={{ flex: 1 }} />
                    <Skeleton height="2.5rem" style={{ flex: 1 }} />
                    <Skeleton height="2.5rem" width="100px" />
                </div>
                <div style={{ marginTop: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ display: "flex", gap: "1rem" }}>
                                <Skeleton height="1rem" style={{ flex: 2 }} />
                                <Skeleton height="1rem" style={{ flex: 1 }} />
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
            <h1><span className="page-title-icon"><FiMapPin /></span> Reservar Viajes</h1>
            <h2 className="dashboard-subtitle">{editingId ? <><IoCreateOutline /> Actualizar</> : <><FaPlus /> Asignar</>}</h2>
            <form onSubmit={handleSubmit}>
                <select name="trip_id" value={formData.trip_id} onChange={handleChange} required>
                    <option value="">Elegir Viaje</option>
                    {availableTripsForReservation.map(t => <option key={t.id} value={t.id}>{formatDate(t.date)}</option>)}
                </select>
                <select name="user_id" value={formData.user_id} onChange={handleChange} required>
                    <option value="">Elegir Miembro</option>
                    {availableMembersForSelectedTrip.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="number" name="advance_payment" placeholder="Adelanto" value={formData.advance_payment} onChange={handleChange} />
                <button type="submit" className="btn primary">{editingId ? "Actualizar" : "Reservar"}</button>
                {isFormDirty && <button type="button" onClick={handleCancel}>✕</button>}
            </form>

            <div className="filters" style={{ margin: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
                <select value={filterTripId} onChange={e => setFilterTripId(e.target.value)} className="filter-select">
                    <option value="">Todos los viajes</option>
                    {trips.map(t => (
                        <option key={t.id} value={t.id}>
                            {formatDate(t.date)}
                        </option>
                    ))}
                </select>
                <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)} className="filter-select">
                    <option value="">Todos los miembros</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
                <button className="btn primary" onClick={handleOpenPaymentModal}>Pagar</button>
                <button onClick={handlePrintReport} className="btn primary">Imprimir</button>
            </div>

            {showSummary && (
                <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowSummary(false)}>
                    <div className="modal-content" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowSummary(false)} title="Cerrar" />
                        <p style={{ marginTop: '8px' }}><strong>{filteredReservations.length} reserva(s)</strong> {filterTripId ? ` para el viaje ${formatDate(trips.find(t => t.id === Number(filterTripId))?.date)}` : ""}{filterUserId ? ` del miembro ${users.find(u => u.id === Number(filterUserId))?.name}` : ""}.</p>
                        <p>Pagado: <strong>${reservationTotals.totalPaid.toLocaleString()}</strong></p>
                        <p>Pendiente: <strong>${reservationTotals.totalPending.toLocaleString()}</strong></p>
                    </div>
                </div>
            )}


            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={handleClosePaymentModal} title="Cerrar" />
                        <h2>Pago de Adelanto</h2>
                        <form onSubmit={handlePaymentSubmit}>
                            <select name="trip_id" value={paymentForm.trip_id} onChange={handlePaymentChange} required>
                                <option value="">Elegir viaje</option>
                                {availableTripsForReservation.map(trip => (
                                    <option key={trip.id} value={trip.id}>{formatDate(trip.date)}</option>
                                ))}
                            </select>
                            {paymentForm.trip_id && (
                                <div className="form-group">
                                    <select name="attendance_id" value={paymentForm.attendance_id} onChange={handlePaymentChange} required>
                                        <option value="">Elegir miembro</option>
                                        {availableReservationsForSelectedTrip.map(res => (
                                            <option key={res.id} value={res.id}>{res.user_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedReservationForPayment && (
                                <div className="form-group full-width">
                                    <p>| <strong>{selectedReservationForPayment.user_name}</strong>    |</p>
                                    <p>| Pagado: <strong>${Number(selectedReservationForPayment.advance_payment).toLocaleString()}</strong> |</p>
                                    <p>| Saldo: <strong>${Number(selectedReservationForPayment.pending_payment).toLocaleString()}</strong> |</p>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="payment_amount">Monto de Pago</label>
                                <input
                                    id="payment_amount"
                                    name="payment_amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={paymentForm.payment_amount}
                                    onChange={handlePaymentChange}
                                    placeholder="Ingrese el monto a pagar"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="payment_date">Fecha de Pago</label>
                                <input
                                    id="payment_date"
                                    name="payment_date"
                                    type="date"
                                    value={paymentForm.payment_date}
                                    readOnly
                                    style={{ background: "var(--bg-body, #f5f5f5)", cursor: "not-allowed", opacity: 0.8 }}
                                />
                            </div>

                            {paymentError && (
                                <p style={{ color: "var(--danger)", marginBottom: "16px" }}>{paymentError}</p>
                            )}

                            <div className="form-group full-width">
                                <button type="submit" className="btn primary" disabled={isSubmittingPayment || !selectedReservationForPayment}>
                                    {isSubmittingPayment ? "Pagando..." : "Pagar"}
                                </button>
                                <button type="button" onClick={handleClosePaymentModal} className="btn cancel-btn">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                Pago
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
                                    <button className="btn secondary extracted-style-4" onClick={() => handleEdit(res)} aria-label="Editar"><IoCreateOutline /></button>
                                    <button className="btn secondary extracted-style-5" onClick={() => handleDelete(res.id)} aria-label="Eliminar"><IoTrashOutline /></button>
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
