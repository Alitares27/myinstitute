from pathlib import Path

path = Path('client/src/pages/TempleAttendance.tsx')
text = path.read_text(encoding='utf-8')
old_state = '''    const [formData, setFormData] = useState({
        user_id: "",
        trip_id: "",
        register_date: getTodayYMD(),
        advance_payment: "",
        pending_payment: "",
        due_date: ""
    });

    const [filterTripId, setFilterTripId] = useState<string>("");
'''
new_state = '''    const [formData, setFormData] = useState({
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
        attendance_id: "",
        payment_amount: "",
        payment_date: getTodayYMD()
    });

    const [filterTripId, setFilterTripId] = useState<string>("");
'''
old_handlers = '''    const handleDelete = async (id: number) => {
        await fetch(`${API_BASE_URL}/trip-reservations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        fetchReservations();
    };

    const membersWithReservations = useMemo(() => {
'''
new_handlers = '''    const handleDelete = async (id: number) => {
        await fetch(`${API_BASE_URL}/trip-reservations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
        });
        fetchReservations();
    };

    const selectedReservationForPayment = reservations.find(
        r => r.id === Number(paymentForm.attendance_id)
    );

    const handleOpenPaymentModal = () => {
        setPaymentError("");
        setPaymentForm({
            attendance_id: "",
            payment_amount: "",
            payment_date: getTodayYMD()
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

        if (!paymentForm.attendance_id) {
            setPaymentError("Selecciona una reserva para el pago");
            return;
        }

        const amount = Number(paymentForm.payment_amount);
        if (Number.isNaN(amount) || amount <= 0) {
            setPaymentError("Ingresa un monto válido mayor a cero");
            return;
        }

        const pending = selectedReservationForPayment ? Number(selectedReservationForPayment.pending_payment) : 0;
        if (amount > pending) {
            setPaymentError("El pago no puede ser mayor al monto pendiente");
            return;
        }

        setIsSubmittingPayment(true);

        const res = await fetch(`${API_BASE_URL}/temple-amortizations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`
            },
            body: JSON.stringify({
                attendance_id: Number(paymentForm.attendance_id),
                payment_amount: amount,
                payment_date: paymentForm.payment_date
            })
        });

        setIsSubmittingPayment(false);

        if (!res.ok) {
            const errorData = await res.json().catch(() => null);
            setPaymentError(errorData?.message || "Error al registrar el pago");
            return;
        }

        handleClosePaymentModal();
        fetchReservations();
    };

    const membersWithReservations = useMemo(() => {
'''
old_button = '''                <button
                    type="button"
                    onClick={handlePrintReport}
                    className="btn secondary"
                    style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", alignSelf: "flex-end" }}
                >
                Imprimir
                </button>

                {filterTripId && !filterUserId && (
'''
new_button = '''                <button
                    type="button"
                    onClick={handlePrintReport}
                    className="btn secondary"
                    style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", alignSelf: "flex-end" }}
                >
                    Imprimir
                </button>

                <button
                    type="button"
                    onClick={handleOpenPaymentModal}
                    className="btn primary"
                    style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", alignSelf: "flex-end" }}
                >
                    ➕ Agregar pago
                </button>

                {filterTripId && !filterUserId && (
'''
old_modal = '''            </div>

            <div className="table-container">
'''
new_modal = '''            </div>

            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Agregar Pago de Adelanto</h2>
                        <form onSubmit={handlePaymentSubmit} className="grid-form">
                            <div className="form-group">
                                <label htmlFor="attendance_id">Reserva</label>
                                <select id="attendance_id" name="attendance_id" value={paymentForm.attendance_id} onChange={handlePaymentChange} required>
                                    <option value="">Seleccionar reserva</option>
                                    {reservations.map(res => (
                                        <option key={res.id} value={res.id}>
                                            {res.user_name} — {formatDate(res.trip_date)} — Pendiente ${Number(res.pending_payment).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

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
                                    onChange={handlePaymentChange}
                                    required
                                />
                            </div>

                            {selectedReservationForPayment && (
                                <div className="form-group full-width">
                                    <p>Saldo pendiente actual: <strong>${Number(selectedReservationForPayment.pending_payment).toLocaleString()}</strong></p>
                                    <p>Pagado actual: <strong>${Number(selectedReservationForPayment.advance_payment).toLocaleString()}</strong></p>
                                </div>
                            )}

                            {paymentError && (
                                <p style={{ color: "var(--danger)", marginBottom: "16px" }}>{paymentError}</p>
                            )}

                            <div className="form-group full-width">
                                <button type="submit" className="btn primary" disabled={isSubmittingPayment}>
                                    {isSubmittingPayment ? "Guardando..." : "Registrar Pago"}
                                </button>
                                <button type="button" onClick={handleClosePaymentModal} className="btn cancel-btn">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-container">
'''

if old_state not in text:
    raise SystemExit('State block not found')
text = text.replace(old_state, new_state, 1)
if old_handlers not in text:
    raise SystemExit('Handlers block not found')
text = text.replace(old_handlers, new_handlers, 1)
if old_button not in text:
    raise SystemExit('Button block not found')
text = text.replace(old_button, new_button, 1)
if old_modal not in text:
    raise SystemExit('Modal block not found')
text = text.replace(old_modal, new_modal, 1)
path.write_text(text, encoding='utf-8')
print('TempleAttendance.tsx patched')
