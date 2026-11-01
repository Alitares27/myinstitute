require("dotenv").config();
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { pool } = require("../dist/models/db");
const { sessionFingerprint } = require("../dist/middleware/auth");
const { startServer } = require("../dist/index");
(async () => {
  process.env.PORT = "0";
  const server = await startServer();
  if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let checks = 0;
  try {
    const users = await pool.query("SELECT DISTINCT ON (role) id, role, password, auth_version FROM users WHERE role IN ('admin','teacher','student') ORDER BY role,id");
    assert.ok(users.rowCount > 0, "No accounts available for read-only smoke test");
    assert.equal((await fetch(`${base}/health`)).status, 200); checks++;
    for (const user of users.rows) {
      const token = jwt.sign({ id: user.id, role: user.role, session: sessionFingerprint(user.password), version: Number(user.auth_version) }, process.env.JWT_SECRET, { expiresIn: "2m" });
      const headers = { Authorization: `Bearer ${token}` };
      for (const route of ["users/me", "users/members?limit=2", `users/${user.id}/academic`, "students", "teachers", "courses", "enrollments", "attendance", "grades", "topics", "meetings", "dashboard-stats", "temple-trips", "temples", "activities"]) {
        const response = await fetch(`${base}/api/${route}`, { headers });
        assert.equal(response.status, 200, `${user.role} GET ${route}`);
        assert.match(response.headers.get("cache-control"), /no-store/);
        const data = await response.json();
        if (["attendance","grades"].includes(route)) { assert.ok(Array.isArray(data.items)); assert.ok(data.items.length<=20); }
        if (route === "enrollments" && user.role === "student") {
          const own = await pool.query("SELECT id FROM students WHERE user_id=$1", [user.id]);
          assert.ok(data.every(row => own.rows.some(student => student.id === row.student_id)));
        }
        if (route === "meetings" && user.role !== "admin") {
          assert.ok(data.every(row => row.created_by === user.id || row.attendees.some(person => person.id === user.id)));
        }
        checks++;
      }
      for (const sort of ["user_name", "trip_date", "adelanto", "abonos", "pagado", "saldo"]) {
        const response = await fetch(`${base}/api/trip-reservations?limit=2&sort=${sort}`, { headers });
        assert.equal(response.status, user.role === "admin" ? 200 : 403);
        if (response.status === 200) {
          const data = await response.json();
          assert.ok(Array.isArray(data.items)); assert.ok(data.items.length <= 2);
          assert.ok(data.total >= data.items.length);
        }
        checks++;
      }
      if (user.role === "admin") {
        const trip = await pool.query("SELECT id FROM temple_trips ORDER BY id LIMIT 1");
        if (trip.rowCount) {
          assert.equal((await fetch(`${base}/api/trip-reservations/options?trip_id=${trip.rows[0].id}`, { headers })).status, 200); checks++;
        }
        for (const route of ["users/organizations", "users/members?profile=student", "temple-amortizations", "temple-amortizations/events", "temple-amortizations/report", "trip-reservations/report", "attendance/report", "grades/report"]) {
          assert.equal((await fetch(`${base}/api/${route}`, { headers })).status, 200); checks++;
        }
      }
    }
    console.log(`PASS: ${checks} read-only HTTP checks against PostgreSQL; roles: ${users.rows.map(u => u.role).join(", ")}`);
  } finally { await new Promise(resolve => server.close(resolve)); await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
