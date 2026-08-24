import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IoCarOutline } from "react-icons/io5";
import { FiMapPin } from "react-icons/fi";
import { formatDate } from "../utils/utilidadesFecha";
import { Skeleton } from "../components/Esqueleto";
import { openPrintWindow } from "../utils/utilidadesReportes";
import api from "../api";

const getTodayYMD = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function PagosTemplos() {
  const navigate = useNavigate();

  const [role, setRole] = useState<string>("");
  const [trips, setTrips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [templos, setTemplos] = useState<Templo[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTripId, setFilterTripId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    trip_id: "",
    attendance_id: "",
    payment_amount: "",
    payment_date: getTodayYMD(),
  });

  const [pagos, setPagos] = useState<any[]>([]);
  const [showSummary, setShowSummary] = useState(false);

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

  const fetchTemplos = async () => {
    const { data } = await api.get("/temples");
    setTemplos(data);
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
    if (filterTripId) params.push(`temple_id=${filterTripId}`);
    if (filterUserId) params.push(`member_id=${filterUserId}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const { data } = await api.get(`/temple-amortizations${qs}`);
    setPagos(data);
  };

  useEffect(() => {
    Promise.all([fetchTrips(), fetchTemplos(), fetchUsers(), fetchReservations()])
      .then(() => fetchPagos())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchPagos();
  }, [filterTripId, filterUserId]);

  useEffect(() => {
    if (filterTripId || filterUserId) setShowSummary(true);
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

  const handleOpenPaymentModal = () => {
    setPaymentError("");
    setPaymentForm({ trip_id: "", attendance_id: "", payment_amount: "", payment_date: getTodayYMD() });
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
      await api.post("/temple-amortizations", {
        attendance_id: Number(paymentForm.attendance_id),
        payment_amount: amount,
        payment_date: paymentForm.payment_date,
      });
      handleClosePaymentModal();
      await fetchReservations();
      await fetchPagos();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || "Error al registrar el pago");
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

  const handlePrintReport = () => {
    const totalPagadoEfectivo = pagos.reduce((acc, p) => acc + (p.payment_type === "efectivo" ? Number(p.payment_amount) : 0), 0);
    const totalPagadoTransferencia = pagos.reduce((acc, p) => acc + (p.payment_type === "transferencia" ? Number(p.payment_amount) : 0), 0);
    const totalPagadoDonacion = pagos.reduce((acc, p) => acc + (p.payment_type === "donacion" ? Number(p.payment_amount) : 0), 0);

    let body = `<table><thead><tr><th>Miembro</th><th>Pagado</th><th>Pendiente</th><th>Fecha Pago</th><th>Medio Pago</th></tr></thead><tbody>`;
    pagos.forEach(p => {
      body += `<tr><td>${p.miembro_nombre}</td><td>$${Number(p.payment_amount).toLocaleString()}</td><td>$${Number(p.monto_adeudado).toLocaleString()}</td><td>${formatDate(p.payment_date)}</td><td>${(p.payment_type || "efectivo").charAt(0).toUpperCase() + (p.payment_type || "efectivo").slice(1)}</td></tr>`;
    });
    body += `</tbody></table>`;

    body += `<div style="margin-top:24px;padding:16px 20px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;display:flex;gap:2rem;">
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Pagado</span><br><strong style="font-size:18px;">$${totals.totalPagado.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Total Adeudado</span><br><strong style="font-size:18px;">$${totals.totalAdeudado.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Efectivo</span><br><strong style="font-size:18px;">$${totalPagadoEfectivo.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Transferencia</span><br><strong style="font-size:18px;">$${totalPagadoTransferencia.toLocaleString()}</strong></div>
        <div><span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Donación</span><br><strong style="font-size:18px;">$${totalPagadoDonacion.toLocaleString()}</strong></div>
    </div>`;

    openPrintWindow("Reporte de Viajes al Templo", "Rama Arroyo Seco", body);
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
    if (!filterPaymentType) return pagos;
    return pagos.filter(p => (p.payment_type || "efectivo") === filterPaymentType);
  }, [pagos, filterPaymentType]);

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
    <div>
      <h1><span className="page-title-icon"><FiMapPin /></span> Historial de Pagos</h1>

      <div className="reservations-filters">
        <div className="reservations-filter-row">
          <select
            value={filterTripId}
            onChange={e => { setFilterTripId(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="">Todos los templos</option>
            {templos.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={filterUserId}
            onChange={e => { setFilterUserId(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="">Todos los miembros</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            value={filterPaymentType}
            onChange={e => { setFilterPaymentType(e.target.value); setCurrentPage(1); }}
            className="filter-select"
          >
            <option value="">Medios de pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="donacion">Donación</option>
          </select>
        </div>

        <div className="reservations-actions">
          <button className="btn primary" onClick={handleOpenPaymentModal}>
            Pagar
          </button>
          <button type="button" onClick={handlePrintReport} className="btn secondary">
            Imprimir
          </button>
        </div>
      </div>

      {" "}
      {showSummary && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowSummary(false)}>
          <div className="modal-content" style={{ maxWidth: "360px" }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSummary(false)} title="Cerrar" />
            <p style={{ marginTop: "8px" }}>
              <strong>{pagos.length} pago(s)</strong>
              {filterTripId ? ` del viaje ${formatDate(trips.find(t => t.id === Number(filterTripId))?.date)}` : ""}
              {filterUserId ? ` — ${users.find(u => u.id === Number(filterUserId))?.name}` : ""}.
            </p>
            <p>Total pagado: <strong>${totals.totalPagado.toLocaleString()}</strong></p>
            <p>Total adeudado: <strong>${totals.totalAdeudado.toLocaleString()}</strong></p>
          </div>
        </div>
      )}

      {
        showPaymentModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "440px" }}>
              <button className="modal-close" onClick={handleClosePaymentModal} title="Cerrar" />
              <h2 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>Registrar Pago</h2>
              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>

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
                    {trips.map(t => (
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
                  <div style={{ display: "flex", gap: "1rem" }}>
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
                    disabled={isSubmittingPayment || !selectedReservationForPayment}
                  >
                    {isSubmittingPayment ? "Pagando..." : "Pagar"}
                  </button>
                  <button type="button" onClick={handleClosePaymentModal} className="btn cancel-btn">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

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
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.miembro_nombre}</td>
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
                  <td>{p.payment_type || "efectivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {
        totalPages > 1 && (
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
        )
      }
    </div>
  );
}