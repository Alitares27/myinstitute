import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaMoneyBillWave, FaCalendarCheck } from "react-icons/fa";
import { IoCreateOutline, IoTrashOutline, IoCarOutline, IoPrintOutline } from "react-icons/io5";
import { FiMapPin, FiSearch } from "react-icons/fi";
import { TbAlertTriangle } from "react-icons/tb";
import { formatDate, toYMD } from "../utils/utilidadesFecha";
import { openPrintWindow } from "../utils/utilidadesReportes";
import { Skeleton } from "../components/Esqueleto";
import api from "../api";
import { Trip } from "../shared/types";
import useAvailableTrips from "../hooks/usarViajesDisponibles";
import type { BasicUser } from "../interfaces/Common";

const getTodayYMD = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const getInitials = (name: string = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const avatarGradient = (index: number) => {
    const gradients = [
        "",
        " gradient-2",
        " gradient-3"
    ];
    return gradients[index % gradients.length];
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
        payment_date: getTodayYMD(),
        payment_type: "efectivo"
    });

    const [filterTripId, setFilterTripId] = useState<string>("");
    const [filterUserId, setFilterUserId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
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
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userRole = user.role || "";
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
        if (!window.confirm("¿Eliminar esta reserva?")) return;
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
        return reservations
            .filter(r => r.trip_id === Number(paymentForm.trip_id) && Number(r.pending_payment) > 0)
            .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
    }, [paymentForm.trip_id, reservations]);

    const handleOpenPaymentModal = () => {
        setPaymentError("");
        setPaymentForm({
            trip_id: "",
            attendance_id: "",
            payment_amount: "",
            payment_date: getTodayYMD(),
            payment_type: "efectivo"
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
                payment_date: paymentForm.payment_date,
                payment_type: paymentForm.payment_type
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
        return reservations
            .filter(r => {
                if (filterTripId && r.trip_id !== Number(filterTripId)) return false;
                if (filterUserId && r.user_id !== Number(filterUserId)) return false;
                return true;
            })
            .map(r => {
                const abonos = Number(r.total_amortizado) || 0;
                return {
                    ...r,
                    adelanto: Math.max(0, (Number(r.advance_payment) || 0) - abonos),
                    abonos,
                    pagado: Number(r.advance_payment) || 0,
                    saldo: Number(r.pending_payment) || 0,
                    num_pagos: Number(r.num_pagos) || 0
                };
            })
            .filter(r => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                const name = (r.user_name || "").toLowerCase();
                const date = formatDate(r.trip_date).toLowerCase();
                return name.includes(q) || date.includes(q);
            });
    }, [reservations, filterTripId, filterUserId, searchQuery]);

    const reservationTotals = useMemo(() => {
        return filteredReservations.reduce(
            (totals, reservation) => {
                totals.totalPaid += reservation.pagado || 0;
                totals.totalPending += reservation.saldo || 0;
                return totals;
            },
            { totalPaid: 0, totalPending: 0 }
        );
    }, [filteredReservations]);

    const sortedReservations = useMemo(() => {
        if (!sortConfig) return filteredReservations;
        return [...filteredReservations].sort((a, b) => {
            let aVal: any = (a as any)[sortConfig.key as string];
            let bVal: any = (b as any)[sortConfig.key as string];
            if (typeof aVal === "string") aVal = aVal.toLowerCase();
            if (typeof bVal === "string") bVal = bVal.toLowerCase();
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

    const handlePrintReport = useCallback(() => {
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
                totalPagado += r.pagado || 0;
                totalPendiente += r.saldo || 0;
            });

            body += `<h2>Fecha de Viaje: ${date}</h2><table><thead><tr><th>Miembro</th><th>Documento</th><th>Pagado</th><th>Saldo</th></tr></thead><tbody>`;
            sortedMembers.forEach(res => {
                body += `<tr><td>${res.user_name}</td><td>${res.user_document || "-"}</td><td>$${(res.pagado || 0).toLocaleString()}</td><td>${res.saldo > 0 ? `$${res.saldo.toLocaleString()}` : "Saldado"}</td></tr>`;
            });
            body += `</tbody></table>`;
        });

        body += `<div style="margin-top:24px;padding:16px 20px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;display:flex;gap:2rem;">
            <div>
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Registrados</span><br><strong style="font-size:18px;">${totalRegistrados}</strong></div>
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Pagado</span><br><strong style="font-size:18px;">$${totalPagado.toLocaleString()}</strong></div>
            <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Pendiente</span><br><strong style="font-size:18px;">$${totalPendiente.toLocaleString()}</strong></div>
            </div>
        </div>`;

        openPrintWindow("Reporte de Viajes al Templo", "Rama Arroyo Seco", body);
    }, [filteredReservations]);

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
        <div className="asistencia-page">
            <div className="asistencia-header">
                <div className="asistencia-header-info">
                    <h1><span className="page-title-icon"><FiMapPin /></span> Reservar Viajes</h1>
                    <p>Gestión de reservas y pagos a los viajes al templo</p>
                </div>
                <div className="asistencia-header-actions">
                    <button className="btn primary" onClick={handleOpenPaymentModal}><FaPlus /> Pagar</button>
                    <button onClick={handlePrintReport} className="btn secondary"><IoPrintOutline /> Imprimir</button>
                </div>
            </div>

            <div className="asistencia-stats-grid">
                <div className="asistencia-stat-card">
                    <div className="asistencia-stat-icon blue"><FaCalendarCheck /></div>
                    <div className="asistencia-stat-content">
                        <h3>{filteredReservations.length}</h3>
                        <p>Reservas</p>
                    </div>
                </div>
                <div className="asistencia-stat-card">
                    <div className="asistencia-stat-icon green"><FaMoneyBillWave /></div>
                    <div className="asistencia-stat-content">
                        <h3>${reservationTotals.totalPaid.toLocaleString()}</h3>
                        <p>Pagado</p>
                    </div>
                </div>
                <div className="asistencia-stat-card">
                    <div className="asistencia-stat-icon orange"><TbAlertTriangle /></div>
                    <div className="asistencia-stat-content">
                        <h3>${reservationTotals.totalPending.toLocaleString()}</h3>
                        <p>Pendiente</p>
                    </div>
                </div>
                <div className="asistencia-stat-card">
                    <div className="asistencia-stat-icon purple"><IoCarOutline /></div>
                    <div className="asistencia-stat-content">
                        <h3>{availableTripsForReservation.length}</h3>
                        <p>Viajes Disponibles</p>
                    </div>
                </div>
            </div>

            <div className="asistencia-form-card">
                <div className="asistencia-form-header">
                    <h2>{editingId ? <><IoCreateOutline /> Actualizar Reserva</> : <><FaPlus /> Asignar Viaje</>}</h2>
                </div>
                <form onSubmit={handleSubmit} className="asistencia-form-grid">
                    <div className="form-group">
                        <label>Viaje</label>
                        <select name="trip_id" value={formData.trip_id} onChange={handleChange} required>
                            <option value="">Elegir Viaje</option>
                            {availableTripsForReservation.map(t => <option key={t.id} value={t.id}>{formatDate(t.date)}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Miembro</label>
                        <select name="user_id" value={formData.user_id} onChange={handleChange} required>
                            <option value="">Elegir Miembro</option>
                            {availableMembersForSelectedTrip.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Adelanto</label>
                        <input type="number" name="advance_payment" placeholder="Adelanto" value={formData.advance_payment} onChange={handleChange} />
                    </div>
                    <div className="asistencia-form-actions">
                        <button type="submit" className="btn primary">{editingId ? "Actualizar" : "Reservar"}</button>
                        {isFormDirty && <button type="button" onClick={handleCancel} className="btn cancel-btn" title="Cancelar" aria-label="Cancelar">✕</button>}
                    </div>
                </form>
            </div>

            <div className="asistencia-toolbar">
                <div className="asistencia-search-container">
                    <FiSearch style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Buscar por miembro o fecha de viaje..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                    {searchQuery && (
                        <button className="search-clear-btn" onClick={() => setSearchQuery("")} title="Limpiar" aria-label="Limpiar búsqueda">✕</button>
                    )}
                </div>
                <div className="asistencia-filters">
                    <select value={filterTripId} onChange={e => setFilterTripId(e.target.value)}>
                        <option value="">Todos los viajes</option>
                        {trips.map(t => (
                            <option key={t.id} value={t.id}>
                                {formatDate(t.date)}
                            </option>
                        ))}
                    </select>
                    <select value={filterUserId} onChange={e => setFilterUserId(e.target.value)}>
                        <option value="">Todos los miembros</option>
                        {membersWithReservations.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "460px" }}>
                        <button className="modal-close" onClick={handleClosePaymentModal} title="Cerrar" />
                        <h2 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>Registrar Pago</h2>
                        <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div className="form-group">
                                <label htmlFor="trip_id">Viaje</label>
                                <select name="trip_id" id="trip_id" value={paymentForm.trip_id} onChange={handlePaymentChange} required>
                                    <option value="">Elegir viaje</option>
                                    {availableTripsForReservation.map(trip => (
                                        <option key={trip.id} value={trip.id}>{formatDate(trip.date)}</option>
                                    ))}
                                </select>
                            </div>

                            {paymentForm.trip_id && (
                                <div className="form-group">
                                    <label htmlFor="attendance_id">Miembro</label>
                                    <select name="attendance_id" id="attendance_id" value={paymentForm.attendance_id} onChange={handlePaymentChange} required>
                                        <option value="">Elegir miembro</option>
                                        {availableReservationsForSelectedTrip.map(res => (
                                            <option key={res.id} value={res.id}>{res.user_name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedReservationForPayment && (
                                <div className="payment-info-card">
                                    <p><strong>{selectedReservationForPayment.user_name}</strong></p>
                                    <div className="payment-info-grid">
                                        <span>Pagado: <strong>${Number(selectedReservationForPayment.advance_payment).toLocaleString()}</strong></span>
                                        <span>Saldo: <strong>${Number(selectedReservationForPayment.pending_payment).toLocaleString()}</strong></span>
                                    </div>
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
                                <label htmlFor="payment_type">Medio de Pago</label>
                                <select name="payment_type" id="payment_type" value={paymentForm.payment_type} onChange={handlePaymentChange}>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="donacion">Donación</option>
                                </select>
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
                                <p style={{ color: "var(--danger)", margin: 0 }}>{paymentError}</p>
                            )}

                            <div className="form-group full-width" style={{ marginTop: "0.5rem" }}>
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
                            <th onClick={() => handleSort("adelanto")} className="sortable-header">
                                Adelanto
                                <span className="sort-icon">
                                    {sortConfig?.key === "adelanto" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("abonos")} className="sortable-header">
                                Abonos
                                <span className="sort-icon">
                                    {sortConfig?.key === "abonos" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("pagado")} className="sortable-header">
                                Pagado
                                <span className="sort-icon">
                                    {sortConfig?.key === "pagado" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th onClick={() => handleSort("saldo")} className="sortable-header">
                                Saldo
                                <span className="sort-icon">
                                    {sortConfig?.key === "saldo" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                                </span>
                            </th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.map((res, idx) => (
                            <tr key={res.id}>
                                <td>
                                    <div className="student-profile-cell">
                                        <div className={`student-avatar-circle${avatarGradient(idx)}`}>{getInitials(res.user_name)}</div>
                                        <div className="student-details">
                                            <span className="student-name">{res.user_name}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{formatDate(res.trip_date)}</td>
                                <td>${res.adelanto.toLocaleString()}</td>
                                <td>
                                    ${res.abonos.toLocaleString()}
                                    {res.num_pagos > 0 && (
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                            {res.num_pagos} pago{res.num_pagos === 1 ? "" : "s"}
                                        </div>
                                    )}
                                </td>
                                <td>${res.pagado.toLocaleString()}</td>
                                <td>
                                    {res.saldo > 0 ? (
                                        <span style={{
                                            display: "inline-block",
                                            background: "var(--danger, #e74c3c)",
                                            color: "#fff",
                                            borderRadius: "999px",
                                            padding: "2px 10px",
                                            fontSize: "0.82rem",
                                            fontWeight: 600,
                                        }}>
                                            ${res.saldo.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span style={{ color: "var(--success, #27ae60)", fontWeight: 600 }}>Saldado</span>
                                    )}
                                </td>
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