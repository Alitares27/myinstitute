const { test, before, after } = require("node:test");
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken");
process.env.JWT_SECRET = "isolated-postgres-integration-secret";
process.env.DATABASE_URL = "postgresql://isolated:isolated@localhost:1/never-connected";
process.env.PORT = "0";
const { pool } = require("../dist/models/db");
let db, server, base;
const sqlCalls = [];
const fixtures = { 1: { role: "admin" }, 2: { role: "teacher" }, 3: { role: "teacher" }, 42: { role: "student" }, 43: { role: "student" } };
const hash = bcrypt.hashSync("test-password", 4);
function token(id = 1, extra = {}) { const { sessionFingerprint } = require("../dist/middleware/auth"); return jwt.sign({ id, role: fixtures[id].role, version: 0, session: sessionFingerprint(hash), ...extra }, process.env.JWT_SECRET, { expiresIn: "1h" }); }
async function request(route, { id = 1, method = "GET", body, auth, headers = {} } = {}) {
    const response = await fetch(base + route, { method, headers: { ...(id ? { Authorization: `Bearer ${auth || token(id)}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const data = await response.json(); return { status: response.status, data };
}
before(async () => {
    db = new PGlite(); await db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
    const migration = fs.readFileSync(path.join(__dirname, "../migrations/security_and_history.sql"), "utf8");
    await db.exec(migration); await db.exec(migration);
    for (const [id, user] of Object.entries(fixtures)) await db.query("INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)", [Number(id), `Member ${id}`, `user${id}@test.invalid`, hash, user.role]);
    await db.exec(`INSERT INTO teachers(id,user_id,specialty) VALUES(5,2,'A'),(6,3,'B');
 INSERT INTO students(id,user_id) VALUES(7,42),(8,43);
 INSERT INTO courses(id,title,teacher_id) VALUES(1,'Assigned course',5),(2,'Other course',6);
 INSERT INTO enrollments(student_id,course_id) VALUES(7,1),(8,2);
 INSERT INTO topics(id,course_id,title) VALUES(1,1,'Own topic'),(2,2,'Private topic');
 INSERT INTO attendance(student_id,course_id,date,status,topic_id) VALUES(7,1,'2026-01-01','Present',1),(7,1,'2026-01-02','Present',1),(7,1,'2026-01-03','Absent',1),(8,2,'2026-01-01','Present',2);
 INSERT INTO grades(student_id,course_id,grade,grade_type) VALUES(7,1,80,'examen'),(8,2,90,'examen');
 INSERT INTO temples(id,name,status) VALUES(1,'Temple','operating');
 INSERT INTO temple_trips(id,temple_id,trip_date,status,cost) VALUES(1,1,'2999-12-01','programado',100);
 INSERT INTO temple_attendance(id,user_id,trip_id,register_date,advance_payment,pending_payment) VALUES(10,42,1,'2026-01-01',50,50),(11,43,1,'2026-01-01',0,100);
 INSERT INTO temple_amortizations(id,attendance_id,payment_amount,payment_date,payment_type) VALUES(20,10,20,'2026-01-01','efectivo'),(21,10,10,'2026-01-02','transferencia');
 SELECT setval(pg_get_serial_sequence('temple_attendance','id'),11);SELECT setval(pg_get_serial_sequence('temple_amortizations','id'),21);`);
    pool.query = (sql, params = []) => { sqlCalls.push([sql, params]); return db.query(sql, params); };
    pool.connect = async () => ({ query: (sql, params) => db.query(sql, params), release() { } });
    const { startServer } = require("../dist/index"); server = await startServer(); if (!server.listening) await new Promise(resolve => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (db) await db.close(); await pool.end(); });
test("real PostgreSQL migration is idempotent and adds revocation, archive and audit fields", async () => {
    const result = await db.query("SELECT auth_version FROM users WHERE id=1"); assert.equal(result.rows[0].auth_version, 0);
    assert.equal((await db.query("SELECT COUNT(*)::int AS count FROM financial_events")).rows[0].count, 0);
});
test("student identity and course access isolate enrollments, topics, attendance and grades", async () => {
    assert.equal((await request('/api/enrollments', { id: 42 })).data[0].student_id, 7);
    for (const id of [2, 42]) {
        const topics = await request('/api/topics', { id }); assert.equal(topics.status, 200); assert.deepEqual(topics.data.map(row => row.id), [1]);
        assert.deepEqual((await request('/api/courses/2/topics', { id })).data, []);
        for (const route of ['attendance', 'grades']) {
            const result = await request('/api/' + route, { id }); assert.equal(result.status, 200); assert.ok(result.data.items.every(row => row.student_id === 7));
        }
    }
    const forbidden = await request('/api/grades', { id: 2, method: 'POST', body: { student_id: 8, course_id: 2, grade: 50, grade_type: 'examen' } }); assert.equal(forbidden.status, 403);
});
test("pagination, numeric sorting, filtering and reports run as real SQL", async () => {
    for (const route of ['attendance', 'grades', 'temple-amortizations']) {
        const first = await request('/api/' + route + '?limit=1'); assert.equal(first.status, 200, route); assert.equal(first.data.items.length, 1); assert.ok(first.data.total > 1);
        const next = await request('/api/' + route + '?limit=1&page=2'); assert.equal(next.status, 200); assert.notEqual(first.data.items[0].id, next.data.items[0].id);
    }
    for (const sort of ['user_name', 'trip_date', 'adelanto', 'abonos', 'pagado', 'saldo', '__proto__', 'constructor']) {
        const result = await request('/api/trip-reservations?limit=1&sort=' + sort); assert.equal(result.status, 200, sort); assert.equal(result.data.items.length, 1); assert.equal(result.data.total, 2);
    }
    const own = await request('/api/attendance?student_id=7&search=Assigned'); assert.equal(own.data.total, 3);
    assert.equal((await request('/api/attendance/report?student_id=7')).data.length, 3);
    assert.equal((await request('/api/grades/report', { id: 42 })).data.length, 1);
    const payments = await request('/api/temple-amortizations/report'); assert.equal(payments.status, 200); assert.equal(payments.data.items.length, 2);
});
test("reservation page plan restricts installment aggregation to the requested page", async () => {
    await request('/api/trip-reservations?limit=1');
    const [sql, params] = sqlCalls.findLast(([sql]) => sql.includes('page_rows AS'));
    const explained = await db.query('EXPLAIN (ANALYZE,FORMAT JSON) ' + sql, params);
    const plan = explained.rows[0]['QUERY PLAN']; assert.ok(plan[0]['Execution Time'] >= 0);
    assert.ok(!sql.includes('GROUP BY attendance_id')); assert.ok(sql.includes('attendance_id=page_rows.id'));
    console.log('Isolated reservation page EXPLAIN execution: ' + plan[0]['Execution Time'] + ' ms');
});
test("debt includes unpaid reservations once and is independent of number/type of installments", async () => {
    const all = await request('/api/temple-amortizations?limit=1'); assert.equal(all.status, 200); assert.equal(all.data.summary.totalAdeudado, 150); assert.equal(all.data.summary.totalPagado, 30); assert.equal(all.data.items[0].attendance_id, 10);
    const own = await request('/api/temple-amortizations?member_id=42'); assert.equal(own.data.summary.totalAdeudado, 50);
    const transfer = await request('/api/temple-amortizations?member_id=42&payment_type=transferencia'); assert.equal(transfer.status, 200); assert.equal(transfer.data.total, 1); assert.equal(transfer.data.summary.totalAdeudado, 50); assert.equal(transfer.data.summary.totalPagado, 10);
});
test("attendance rate uses recorded present and absent rows, not topics", async () => {
    for (const id of [2, 42]) { const result = await request('/api/dashboard-stats', { id }); assert.equal(result.status, 200); assert.equal(result.data.attendanceRate, '67%'); }
});
test("paid trip, temple and reservation deletion preserve all financial records", async () => {
    for (const route of ['/api/temple-trips/1', '/api/temples/1', '/api/trip-reservations/10']) assert.equal((await request(route, { method: 'DELETE' })).status, route.includes('trip-reservations') ? 400 : 409);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM temple_amortizations')).rows[0].count, 2);
});
test("trip and temple without financial history can still be deleted successfully", async () => {
    await db.exec("INSERT INTO temples(id,name,status) VALUES(1000,'Free A','operating'),(1001,'Free B','operating'); INSERT INTO temple_trips(id,temple_id,trip_date,status,cost) VALUES(1000,1000,'2999-01-01','programado',0),(1001,1001,'2999-01-01','programado',0); INSERT INTO temple_attendance(id,user_id,trip_id,register_date,advance_payment,pending_payment) VALUES(1000,42,1000,'2026-01-01',0,0)");
    assert.equal((await request('/api/temple-trips/1000', { method: 'DELETE' })).status, 200);
    assert.equal((await request('/api/temples/1001', { method: 'DELETE' })).status, 200);
    assert.equal((await request('/api/temples/1000', { method: 'DELETE' })).status, 200);
    assert.equal((await db.query('SELECT id FROM temple_trips WHERE id IN (1000,1001)')).rowCount, 0);
});
test("payment creation and reversal reconcile balances and leave an immutable event record", async () => {
    const created = await request('/api/temple-amortizations', { method: 'POST', body: { attendance_id: 11, payment_amount: 20, payment_date: '2026-01-03', payment_type: 'efectivo' } }); assert.equal(created.status, 201); const paymentId = created.data.amortization.id;
    assert.equal(Number((await db.query('SELECT pending_payment FROM temple_attendance WHERE id=11')).rows[0].pending_payment), 80);
    const deleted = await request('/api/temple-amortizations/' + paymentId, { method: 'DELETE' }); assert.equal(deleted.status, 200);
    assert.equal(Number((await db.query('SELECT pending_payment FROM temple_attendance WHERE id=11')).rows[0].pending_payment), 100);
    assert.equal((await request('/api/trip-reservations/11', { method: 'DELETE' })).status, 400);
    const events = await request('/api/temple-amortizations/events'); assert.equal(events.status, 200); const reversal = events.data.items.find(event => event.event_type === 'payment_reversed' && event.details.id === paymentId);
    assert.equal(reversal?.reservation_member_name, 'Member 43');
    assert.equal(reversal?.actor_name, 'Member 1');
});
test("reservation editing reconciles the initial payment without double-counting installments", async () => {
    const response = await request('/api/trip-reservations/10', { method: 'PUT', body: { user_id: 42, trip_id: 1, register_date: '2026-01-01', initial_payment: 20 } }); assert.equal(response.status, 200); assert.equal(Number(response.data.advance_payment), 50); assert.equal(Number(response.data.pending_payment), 50);
});
test("initial-payment corrections retain a financial trace and block deletion after zeroing", async () => {
    await db.exec("INSERT INTO temple_attendance(id,user_id,trip_id,register_date,advance_payment,pending_payment) VALUES(12,1,1,'2026-01-01',5,95)");
    const edited = await request('/api/trip-reservations/12', { method: 'PUT', body: { user_id: 1, trip_id: 1, register_date: '2026-01-01', initial_payment: 0 } }); assert.equal(edited.status, 200);
    assert.equal((await request('/api/trip-reservations/12', { method: 'DELETE' })).status, 400);
    const events = await db.query("SELECT details FROM financial_events WHERE reservation_id=12"); assert.equal(Number(events.rows[0].details.before.advance_payment), 5);
});
test("missing meetings return 404 without inserting or deleting attendees", async () => {
    const response = await request('/api/meetings/99999', { method: 'PUT', body: { title: 'Missing', meeting_date: '2026-01-01', start_time: '10:00', topics: 'Topic', attendees: [] } }); assert.equal(response.status, 404);
    assert.equal((await request('/api/meetings/99999', { method: 'DELETE' })).status, 404);
});
test("compressed bodies are rejected before decompression and server stays healthy", async () => {
    const response = await request('/api/users/login', { id: null, method: 'POST', body: 'not-a-valid-gzip', headers: { 'Content-Encoding': 'gzip', 'Content-Type': 'application/json' } }); assert.equal(response.status, 415); assert.equal((await request('/health', { id: null })).status, 200);
});
test("failed login limits apply per account and do not block another account on the same IP", async () => {
    for (let i = 0; i < 10; i++)assert.equal((await request('/api/users/login', { id: null, method: 'POST', body: { email: 'blocked@test.invalid', password: 'wrong' } })).status, 401);
    assert.equal((await request('/api/users/login', { id: null, method: 'POST', body: { email: 'blocked@test.invalid', password: 'wrong' } })).status, 429);
    assert.equal((await request('/api/users/login', { id: null, method: 'POST', body: { email: 'another@test.invalid', password: 'wrong' } })).status, 401);
});
test("archive keeps financial history, hides entities from active catalogs and rejects new reservations", async () => {
    assert.equal((await request('/api/temples/1/archive', { method: 'PATCH' })).status, 200);
    assert.equal((await request('/api/temples')).data.length, 0); assert.equal((await request('/api/temple-trips')).data.length, 0);
    assert.equal((await request('/api/temple-trips?include_archived=true')).data.length, 1);
    assert.equal((await request('/api/trip-reservations', { method: 'POST', body: { user_id: 1, trip_id: 1, register_date: '2026-01-01', initial_payment: 0 } })).status, 400);
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM temple_amortizations')).rows[0].count, 2);
});
test("member directory scopes personal data and academic summaries by authenticated role", async () => {
    const all = await request('/api/users/members?limit=2'); assert.equal(all.status, 200); assert.equal(all.data.items.length, 2); assert.equal(all.data.total, 5);
    const teacher = await request('/api/users/members', { id: 2 }); assert.deepEqual(teacher.data.items.map(x => x.id), [42]); assert.equal(teacher.data.items[0].document, null);
    const own = await request('/api/users/members', { id: 42 }); assert.deepEqual(own.data.items.map(x => x.id), [42]);
    assert.equal((await request('/api/users/43/academic', { id: 2 })).status, 404);
    assert.equal((await request('/api/users/42/academic', { id: 43 })).status, 404);
    const details = await request('/api/users/42/academic', { id: 2 }); assert.equal(details.status, 200); assert.equal(details.data.member.student_id, 7); assert.equal(details.data.summary.courses, 1); assert.equal(details.data.summary.present, 2); assert.equal(details.data.summary.absent, 1); assert.equal(Number(details.data.summary.average_grade), 80);
    assert.equal((await request('/api/users/organizations', { id: 2 })).status, 403);
    assert.equal((await request('/api/users/members?profile=invalid')).status, 400);
    assert.equal((await request('/api/users', { id: 2, method: 'POST', body: {} })).status, 403);
});

test("unified member writes preserve dual profiles, dates, history and session validity", async () => {
    await db.exec("SELECT setval(pg_get_serial_sequence('users','id'),43);SELECT setval(pg_get_serial_sequence('students','id'),8);SELECT setval(pg_get_serial_sequence('teachers','id'),6)");
    const input = { name: 'Dual member', email: 'dual@test.invalid', role: 'admin', password: 'test-password', include_student_profile: true, grade: 'Organization A', student_enrollment_date: '2020-02-29', document: '9223372036854775807' };
    const created = await request('/api/users', { method: 'POST', body: input }); assert.equal(created.status, 201, JSON.stringify(created.data)); const member = created.data.user; assert.ok(member.student_id); assert.equal(member.document, input.document);
    const updated = await request('/api/users/' + member.id, { method: 'PUT', body: { name: input.name, email: input.email, role: 'admin' } }); assert.equal(updated.status, 200); assert.equal(updated.data.grade, input.grade); assert.match(updated.data.student_enrollment_date, /2020-02-29/);
    assert.equal((await db.query('SELECT auth_version FROM users WHERE id=$1', [member.id])).rows[0].auth_version, 0);
    const filtered = await request('/api/users/members?profile=student&role=admin'); assert.deepEqual(filtered.data.items.map(x => x.id), [member.id]);
    const unchanged = await request('/api/users/42', { method: 'PUT', body: { name: 'Student renamed', email: 'user42@test.invalid', role: 'student', grade: 'Updated organization', student_enrollment_date: '2021-06-15' } }); assert.equal(unchanged.status, 200, JSON.stringify(unchanged.data)); assert.equal(unchanged.data.student_id, 7); assert.equal((await request('/api/users/me', { id: 42 })).status, 200);
    assert.equal((await request('/api/users/42', { method: 'DELETE' })).status, 409);
    assert.equal((await request('/api/users/2', { method: 'DELETE' })).status, 409);
    assert.equal((await request('/api/users/1', { method: 'DELETE' })).status, 409);
    await db.query('INSERT INTO enrollments(student_id,course_id) VALUES($1,1)', [member.student_id]);
    assert.equal((await request('/api/users/' + member.id + '/student-profile', { method: 'DELETE' })).status, 409);
    await db.query('DELETE FROM enrollments WHERE student_id=$1', [member.student_id]);
    assert.equal((await request('/api/users/' + member.id + '/student-profile', { method: 'DELETE' })).status, 200);
    assert.equal((await db.query('SELECT id FROM users WHERE id=$1', [member.id])).rowCount, 1);
    assert.equal((await request('/api/users/' + member.id, { method: 'DELETE' })).status, 200);
    assert.equal((await db.query('SELECT id FROM users WHERE id=$1', [member.id])).rowCount, 0);
});

test("member validation and conflicts roll back without leaving orphan profiles", async () => {
    const input = { name: 'New teacher', email: 'newteacher@test.invalid', role: 'teacher', password: 'test-password', specialty: 'Math' };
    for (const change of [{ document: '9223372036854775808' }, { student_enrollment_date: '2026-02-30' }, { grade: 'a'.repeat(21) }, { password: 123 }, { include_student_profile: 'true' }]) assert.equal((await request('/api/users', { method: 'POST', body: { ...input, ...change } })).status, 400);
    const created = await request('/api/users', { method: 'POST', body: input }); assert.equal(created.status, 201); assert.ok(created.data.user.teacher_id); assert.equal(created.data.user.student_id, null);
    assert.equal((await request('/api/users', { method: 'POST', body: input })).status, 409);
    assert.equal((await db.query('SELECT COUNT(*)::int n FROM users WHERE email=$1', [input.email])).rows[0].n, 1);
    assert.equal((await request('/api/users/' + created.data.user.id, { method: 'DELETE' })).status, 200);
    assert.equal((await request('/api/users/999999', { method: 'PUT', body: { ...input, password: '' } })).status, 404);
});

test("trip-specific statistics never include another trip's reservations or payments",async()=>{
 const beforeReservations=(await request('/api/trip-reservations?trip_id=1&limit=1')).data;
 const beforePayments=(await request('/api/temple-amortizations?trip_id=1&limit=1')).data;
 await db.exec("INSERT INTO temple_trips(id,temple_id,trip_date,status,cost) VALUES(1002,1,'2999-02-01','programado',1000);INSERT INTO temple_attendance(id,user_id,trip_id,register_date,advance_payment,pending_payment) VALUES(1002,43,1002,'2026-01-01',100,900);INSERT INTO temple_amortizations(id,attendance_id,payment_amount,payment_date,payment_type) VALUES(1002,1002,60,'2026-01-01','efectivo')");
 try{
  const reservations=(await request('/api/trip-reservations?trip_id=1002&limit=1')).data;
  assert.equal(reservations.total,1);assert.equal(reservations.summary.totalPaid,100);assert.equal(reservations.summary.totalPending,900);
  const payments=(await request('/api/temple-amortizations?trip_id=1002&limit=1')).data;
  assert.equal(payments.total,1);assert.equal(Number(payments.summary.totalPagado),60);assert.equal(Number(payments.summary.totalAdeudado),900);assert.equal(Number(payments.summary.totalSaldados),0);
  assert.deepEqual((await request('/api/trip-reservations?trip_id=1&limit=1')).data.summary,beforeReservations.summary);
  assert.deepEqual((await request('/api/temple-amortizations?trip_id=1&limit=1')).data.summary,beforePayments.summary);
 }finally{await db.exec('DELETE FROM temple_amortizations WHERE id=1002;DELETE FROM temple_attendance WHERE id=1002;DELETE FROM temple_trips WHERE id=1002');}
});

test("logout increments persisted version and invalidates copies of every previous token", async () => {
    const old = token(1); assert.equal((await request('/api/logout', { method: 'POST', auth: old })).status, 200);
    assert.equal((await request('/api/users/me', { auth: old })).status, 401);
    assert.equal((await db.query('SELECT auth_version FROM users WHERE id=1')).rows[0].auth_version, 1);
});
