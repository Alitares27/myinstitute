import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IoCreateOutline, IoTrashOutline, IoPrintOutline, IoCashOutline } from "react-icons/io5";
import { FiMapPin, FiSearch } from "react-icons/fi";
import { FaMoneyBillWave, FaCheckCircle, FaPlus } from "react-icons/fa";
import { TbAlertTriangle } from "react-icons/tb";
import { formatDate } from "../utils/utilidadesFecha";
import { Skeleton } from "../components/Esqueleto";
import { openPrintWindow } from "../utils/utilidadesReportes";
import api from "../api";
import useAvailableTrips from "../hooks/usarViajesDisponibles";

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
  const gradients = ["", " gradient-2", " gradient-3"];
  return gradients[index % gradients.length];
};

const capitalizarMedio = (value: string = "efectivo") => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export default function PagosTemplos() {
  const navigate = useNavigate();

  const [role, setRole] = useState<string>("");
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTripId, setFilterTripId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    trip_id: "",
    attendance_id: "",
    payment_amount: "",
    payment_date: getTodayYMD(),
    payment_type: "efectivo",
  });

  const [pagos, setPagos] = useState<any[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(user.role || "");
    if (!user.role || user.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  const fetchTrips = async () => {
    const { data } = await api.get("/temple-trips");
    setTrips(data);
  };

  const fetchUsers = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };

  const fetchReservations = async () => {
    const { data } = await api.get("/trip-reservations");
    setReservations(data);
  };

  const fetchPagos = async () => {
    const params: string[] = [];
    if (filterTripId) params.push(`trip_id=${filterTripId}`);
    if (filterUserId) params.push(`member_id=${filterUserId}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const { data } = await api.get(`/temple-amortizations${qs}`);
    setPagos(data);
  };

  useEffect(() => {
    Promise.all([fetchTrips(), fetchUsers(), fetchReservations()])
      .then(() => fetchPagos())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchPagos();
  }, [filterTripId, filterUserId]);

  const availableReservationsForSelectedTrip = useMemo(() => {
    if (!paymentForm.trip_id) return [];
    return reservations
      .filter(r => r.trip_id === Number(paymentForm.trip_id) && Number(r.pending_payment) > 0)
      .sort((a, b) => (a.user_name || "").localeCompare(b.user_name || ""));
  }, [paymentForm.trip_id, reservations]);

  const selectedReservationForPayment = reservations.find(
    r => r.id === Number(paymentForm.attendance_id)
  );

  const availableTrips = useAvailableTrips(trips);

  const handleOpenPaymentModal = () => {
    setEditingPayment(null);
    setPaymentError("");
    setPaymentForm({ trip_id: "", attendance_id: "", payment_amount: "", payment_date: getTodayYMD(), payment_type: "efectivo" });
    setShowPaymentModal(true);
  };

  const handleOpenEditModal = (pago: any) => {
    setEditingPayment(pago);
    setPaymentError("");
    setPaymentForm({
      trip_id: "",
      attendance_id: "",
      payment_amount: String(pago.payment_amount),
      payment_date: pago.payment_date ? pago.payment_date.split("T")[0] : getTodayYMD(),
      payment_type: pago.payment_type || "efectivo",
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentError("");
    setEditingPayment(null);
  };

  const handleDeletePayment = async (pago: any) => {
    if (!window.confirm(`¿Eliminar el pago de $${Number(pago.payment_amount).toLocaleString()} de ${pago.miembro_nombre}?`)) return;
    setIsDeletingId(pago.id);
    try {
      await api.delete(`/temple-amortizations/${pago.id}`);
      await fetchReservations();
      await fetchPagos();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al eliminar el pago");
    } finally {
      setIsDeletingId(null);
    }
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
      if (editingPayment) {
        await api.put(`/temple-amortizations/${editingPayment.id}`, {
          payment_amount: amount,
          payment_date: paymentForm.payment_date,
          payment_type: paymentForm.payment_type,
        });
      } else {
        await api.post("/temple-amortizations", {
          attendance_id: Number(paymentForm.attendance_id),
          payment_amount: amount,
          payment_date: paymentForm.payment_date,
          payment_type: paymentForm.payment_type,
        });
      }
      handleClosePaymentModal();
      await fetchReservations();
      await fetchPagos();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || (editingPayment ? "Error al editar el pago" : "Error al registrar el pago"));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const totals = useMemo(() => pagos.reduce(
    (acc, p) => {
      acc.totalPagado += Number(p.payment_amount) || 0;
      acc.totalAdeudado += Number(p.monto_adeudado) || 0;
      return acc;
    },
    { totalPagado: 0, totalAdeudado: 0 }
  ), [pagos]);

  const filteredPagos = useMemo(() => {
    return pagos.filter(p => {
      if (filterPaymentType && (p.payment_type || "efectivo") !== filterPaymentType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(p.miembro_nombre || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [pagos, filterPaymentType, searchQuery]);

  const filteredTotals = useMemo(() => filteredPagos.reduce(
    (acc, p) => {
      acc.totalPagado += Number(p.payment_amount) || 0;
      acc.totalAdeudado += Number(p.monto_adeudado) || 0;
      return acc;
    },
    { totalPagado: 0, totalAdeudado: 0 }
  ), [filteredPagos]);

  const totalSaldados = useMemo(
    () => filteredPagos.filter(p => (Number(p.monto_adeudado) || 0) <= 0).length,
    [filteredPagos]
  );

  const handlePrintReport = () => {
    const totalPagadoEfectivo = filteredPagos.reduce((acc, p) => acc + (p.payment_type === "efectivo" ? Number(p.payment_amount) : 0), 0);
    const totalPagadoTransferencia = filteredPagos.reduce((acc, p) => acc + (p.payment_type === "transferencia" ? Number(p.payment_amount) : 0), 0);
    const totalPagadoDonacion = filteredPagos.reduce((acc, p) => acc + (p.payment_type === "donacion" ? Number(p.payment_amount) : 0), 0);

    let body = `<table><thead><tr><th>Miembro</th><th>Pagado</th><th>Pendiente</th><th>Fecha Pago</th><th>Medio Pago</th></tr></thead><tbody>`;
    filteredPagos.forEach(p => {
      body += `<tr><td>${p.miembro_nombre}</td><td>$${Number(p.payment_amount).toLocaleString()}</td><td>$${Number(p.monto_adeudado).toLocaleString()}</td><td>${formatDate(p.payment_date)}</td><td>${capitalizarMedio(p.payment_type)}</td></tr>`;
    });
    body += `</tbody></table>`;

    body += `<div style="margin-top:24px;padding:16px 20px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;display:flex;gap:2rem;">
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Pagado</span><br><strong style="font-size:18px;">$${filteredTotals.totalPagado.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Adeudado</span><br><strong style="font-size:18px;">$${filteredTotals.totalAdeudado.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Efectivo</span><br><strong style="font-size:18px;">$${totalPagadoEfectivo.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Transferencia</span><br><strong style="font-size:18px;">$${totalPagadoTransferencia.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Donación</span><br><strong style="font-size:18px;">$${totalPagadoDonacion.toLocaleString()}</strong></div>
    </div>`;

    openPrintWindow("Reporte de Pagos al Templo", "Rama Arroyo Seco", body);
  };

  const sortedPagos = useMemo(() => {
    if (!sortConfig) return filteredPagos;
    return [...filteredPagos].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredPagos, sortConfig]);

  const totalPages = Math.ceil(sortedPagos.length / recordsPerPage);

  const currentRecords = useMemo(() => {
    const last = currentPage * recordsPerPage;
    const first = last - recordsPerPage;
    return sortedPagos.slice(first, last);
  }, [sortedPagos, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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
          <h1><span className="page-title-icon"><FiMapPin /></span> Historial de Pagos</h1>
          <p>Historial de amortizaciones de los viajes al templo</p>
        </div>
        <div className="asistencia-header-actions">
          <button className="btn primary" onClick={handleOpenPaymentModal}><FaPlus /> Pagar</button>
          <button type="button" onClick={handlePrintReport} className="btn secondary"><IoPrintOutline /> Imprimir</button>
        </div>
      </div>

      <div className="asistencia-stats-grid">
        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon blue"><IoCashOutline /></div>
          <div className="asistencia-stat-content">
            <h3>{filteredPagos.length}</h3>
            <p>Nº Pagos</p>
          </div>
        </div>
        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon green"><FaMoneyBillWave /></div>
          <div className="asistencia-stat-content">
            <h3>${filteredTotals.totalPagado.toLocaleString()}</h3>
            <p>Total Pagado</p>
          </div>
        </div>
        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon orange"><TbAlertTriangle /></div>
          <div className="asistencia-stat-content">
            <h3>${filteredTotals.totalAdeudado.toLocaleString()}</h3>
            <p>Total Adeudado</p>
          </div>
        </div>
        <div className="asistencia-stat-card">
          <div className="asistencia-stat-icon purple"><FaCheckCircle /></div>
          <div className="asistencia-stat-content">
            <h3>{totalSaldados}</h3>
            <p>Saldados</p>
          </div>
        </div>
      </div>

      <div className="asistencia-toolbar">
        <div className="asistencia-search-container">
          <FiSearch style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por miembro..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery("")} title="Limpiar" aria-label="Limpiar búsqueda">✕</button>
          )}
        </div>
        <div className="asistencia-filters">
          <select
            value={filterTripId}
            onChange={e => { setFilterTripId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos los viajes</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>
                {formatDate(t.date)}
              </option>
            ))}
          </select>

          <select
            value={filterUserId}
            onChange={e => { setFilterUserId(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todos los miembros</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            value={filterPaymentType}
            onChange={e => { setFilterPaymentType(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Medios de pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="donacion">Donación</option>
          </select>
        </div>
      </div>

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "440px" }}>
            <button className="modal-close" onClick={handleClosePaymentModal} title="Cerrar" />
            <h2 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>
              {editingPayment ? `Editar Pago — ${editingPayment.miembro_nombre}` : "Registrar Pago"}
            </h2>
            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>

              {!editingPayment && (
                <>
                  <div className="form-group">
                    <label htmlFor="pay_trip_id">Viaje</label>
                    <select
                      id="pay_trip_id"
                      name="trip_id"
                      value={paymentForm.trip_id}
                      onChange={handlePaymentChange}
                      required
                    >
                      <option value="">Elegir viaje</option>
                      {availableTrips.map(t => (
                        <option key={t.id} value={t.id}>{formatDate(t.date)}</option>
                      ))}
                    </select>
                  </div>

                  {paymentForm.trip_id && (
                    <div className="form-group">
                      <label htmlFor="pay_attendance_id">Miembro</label>
                      <select
                        id="pay_attendance_id"
                        name="attendance_id"
                        value={paymentForm.attendance_id}
                        onChange={handlePaymentChange}
                        required
                      >
                        <option value="">Elegir miembro</option>
                        {availableReservationsForSelectedTrip.map(res => (
                          <option key={res.id} value={res.id}>{res.user_name}</option>
                        ))}
                      </select>
                      {availableReservationsForSelectedTrip.length === 0 && (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>
                          Sin saldo pendiente para este viaje.
                        </p>
                      )}
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
                </>
              )}

              <div className="form-group">
                <label htmlFor="pay_payment_amount">Monto de Pago</label>
                <input
                  id="pay_payment_amount"
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
                <label htmlFor="pay_payment_date">Fecha de Pago</label>
                <input
                  id="pay_payment_date"
                  name="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  readOnly
                  style={{ background: "var(--bg-body, #f5f5f5)", cursor: "not-allowed", opacity: 0.8 }}
                />
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Medio Pago</label>
                  <select
                    style={{ flex: 1, minWidth: "120px" }}
                    value={paymentForm.payment_type || "efectivo"}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_type: e.target.value }))}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="donacion">Donación</option>
                  </select>
                </div>
              </div>

              {paymentError && (
                <p style={{ color: "var(--danger)", margin: 0 }}>{paymentError}</p>
              )}

              <div className="form-group full-width" style={{ marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={isSubmittingPayment || (!editingPayment && !selectedReservationForPayment)}
                >
                  {isSubmittingPayment
                    ? (editingPayment ? "Guardando..." : "Pagando...")
                    : (editingPayment ? "Guardar cambios" : "Pagar")}
                </button>
                <button type="button" onClick={handleClosePaymentModal} className="btn cancel-btn">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        {pagos.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0" }}>
            No hay pagos registrados{filterTripId || filterUserId ? " para el filtro seleccionado" : ""}.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("miembro_nombre")} className="sortable-header">
                  Miembro
                  <span className="sort-icon">
                    {sortConfig?.key === "miembro_nombre" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => handleSort("payment_amount")} className="sortable-header">
                  Monto Pagado
                  <span className="sort-icon">
                    {sortConfig?.key === "payment_amount" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => handleSort("monto_adeudado")} className="sortable-header">
                  Monto Adeudado
                  <span className="sort-icon">
                    {sortConfig?.key === "monto_adeudado" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => handleSort("payment_date")} className="sortable-header">
                  Fecha Pago
                  <span className="sort-icon">
                    {sortConfig?.key === "payment_date" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th onClick={() => handleSort("payment_type")} className="sortable-header">
                  Medio Pago
                  <span className="sort-icon">
                    {sortConfig?.key === "payment_type" ? (sortConfig.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th style={{ width: "96px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((p: any, idx: number) => (
                <tr key={p.id}>
                  <td>
                    <div className="student-profile-cell">
                      <div className={`student-avatar-circle${avatarGradient(idx)}`}>{getInitials(p.miembro_nombre)}</div>
                      <div className="student-details">
                        <span className="student-name">{p.miembro_nombre}</span>
                      </div>
                    </div>
                  </td>
                  <td>${Number(p.payment_amount).toLocaleString()}</td>
                  <td>
                    {Number(p.monto_adeudado) > 0 ? (
                      <span style={{
                        display: "inline-block",
                        background: "var(--danger, #e74c3c)",
                        color: "#fff",
                        borderRadius: "999px",
                        padding: "2px 10px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}>
                        ${Number(p.monto_adeudado).toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: "var(--success, #27ae60)", fontWeight: 600 }}>Saldado</span>
                    )}
                  </td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>{capitalizarMedio(p.payment_type)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="btn secondary extracted-style-4"
                        onClick={() => handleOpenEditModal(p)}
                        aria-label="Editar"
                      >
                        <IoCreateOutline />
                      </button>
                      <button
                        className="btn secondary extracted-style-5"
                        onClick={() => handleDeletePayment(p)}
                        disabled={isDeletingId === p.id}
                        aria-label="Eliminar"
                      >
                        {isDeletingId === p.id ? "⏳" : <IoTrashOutline />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination-dropdown">
          <span>PÁGINA:</span>
          <select
            value={currentPage}
            onChange={e => setCurrentPage(Number(e.target.value))}
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