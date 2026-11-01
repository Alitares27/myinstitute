const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET = "regression-test-secret-not-used-in-production";
const jwt = require("jsonwebtoken");
const { pool } = require("../dist/models/db");
const { app } = require("../dist/index");
const { sessionFingerprint } = require("../dist/middleware/auth");
const { cents, isoDate, positiveId, reservationBalance } = require("../dist/utils/validation");
const { prepareRoleChange } = require("../dist/utils/roles");
const users = new Map([[1,{role:"admin",password:"hash-admin",auth_version:0}],[2,{role:"teacher",password:"hash-teacher",auth_version:0}],[3,{role:"student",password:"hash-student",auth_version:0}]]);
let server, base, calls, transaction, queryHandler, connectError;
const rows = (...values) => ({ rows:values, rowCount:values.length });
const token = (id, override={}) => jwt.sign({ id, role:users.get(id).role, session:sessionFingerprint(users.get(id).password), version:users.get(id).auth_version, ...override }, process.env.JWT_SECRET, {expiresIn:"1h"});
async function request(path, id=1, body, method=body ? "POST" : "GET", authToken) {
  return fetch(base+path, { method, headers:{"Content-Type":"application/json", ...(id ? {Authorization:`Bearer ${authToken || token(id)}`} : {})}, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(3000) });
}
before(async () => { server=app.listen(0,"127.0.0.1"); await new Promise(r=>server.once("listening",r)); base=`http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(r=>server.close(r)); await pool.end(); });
beforeEach(() => {
  calls=[]; transaction=[]; connectError=false; queryHandler=async()=>rows();
  pool.query=async(sql,params=[])=>{ calls.push([sql,params]); if(sql.startsWith("SELECT role, password, auth_version FROM users")) return users.has(params[0]) ? rows(users.get(params[0])) : rows(); return queryHandler(sql,params); };
  pool.connect=async()=> { if(connectError) throw new Error("Simulated pool failure"); return { query:async(sql,params=[])=>{transaction.push([sql,params]); return queryHandler(sql,params);}, release:()=>transaction.push(["RELEASE",[]]) }; };
});
test("money arithmetic preserves cents and rejects invalid, negative, overpaid amounts", () => {
  for(const value of [-1, Infinity, NaN, "Infinity", "1.001", "", null, true]) assert.throws(()=>cents(value));
  assert.throws(()=>cents(0,false));
  assert.equal(cents("0.29"),29);
  assert.deepEqual(reservationBalance("0.30","0.10","0.20"),{advance:0.3,pending:0});
  assert.throws(()=>reservationBalance(10,5,6));
  for(let i=0;i<1000;i++) { const cost=100000+i, initial=i%1000, paid=i%100; const result=reservationBalance(cost/100,initial/100,paid/100); assert.equal(cents(result.advance)+cents(result.pending),cost); }
});
test("identifiers and calendar dates reject invalid values",()=>{
  for(const value of [0,-1,1.1,NaN,Infinity,"x"]) assert.throws(()=>positiveId(value));
  for(const value of ["2026-02-30","2026-13-01","30/10/2026",null]) assert.throws(()=>isoDate(value));
  assert.equal(isoDate("2024-02-29"),"2024-02-29");
});
test("HTTP health, missing/forged/expired tokens and private cache headers",async()=>{
  assert.equal((await request("/health",null)).status,200);
  assert.equal((await request("/api/users/me",null)).status,401);
  assert.equal((await request("/api/users/me",1,undefined,"GET","forged")).status,401);
  const expired=jwt.sign({id:1,role:"admin"},process.env.JWT_SECRET,{expiresIn:-1});
  const res=await request("/api/users/me",1,undefined,"GET",expired);
  assert.equal(res.status,401);assert.match(res.headers.get("cache-control"),/no-store/);
});
test("password changes, role changes and deleted accounts invalidate old sessions",async()=>{
  const original=users.get(1), old=token(1);
  for(const replacement of [{...original,password:"new-hash"},{...original,role:"student"},null]) {
    if(replacement) users.set(1,replacement);else users.delete(1);
    assert.equal((await request("/api/users/me",1,undefined,"GET",old)).status,401);
  }
  users.set(1,original);
});
test("students and teachers cannot read reservations, reports or options",async()=>{
  for(const id of [2,3]) for(const path of ["/api/trip-reservations","/api/trip-reservations/report","/api/trip-reservations/options?trip_id=1"]) assert.equal((await request(path,id)).status,403);
  assert.equal(calls.filter(([sql])=>sql.includes("temple_attendance")).length,0);
});
test("students cannot create attendance or grades",async()=>{
  for(const path of ["/api/attendance","/api/grades"]) assert.equal((await request(path,3,{student_id:3,course_id:1})).status,403);
  assert.equal(calls.filter(([sql])=>sql.includes("INSERT")).length,0);
});
test("attendance requires enrollment, a matching topic and valid status/date",async()=>{
  const body={student_id:5,course_id:1,topic_id:2,date:"2026-01-01",status:"Present"};
  queryHandler=async(sql)=>sql.includes("SELECT id FROM courses")?rows({id:1}):rows();
  assert.equal((await request("/api/attendance",2,body)).status,400);
  queryHandler=async(sql)=>sql.includes("enrollments")?rows({id:5}):rows();
  assert.equal((await request("/api/attendance",1,body)).status,400);
  assert.equal((await request("/api/attendance",1,{...body,status:"anything"})).status,400);
  assert.equal((await request("/api/attendance",1,{...body,date:"2026-02-30"})).status,400);
  assert.equal((await request("/api/attendance",1,{...body,date:"2999-01-01"})).status,400);
  assert.ok(!calls.some(([sql])=>sql.includes("INSERT INTO attendance")));
});
test("teacher cannot grade an unassigned course and invalid grades are rejected",async()=>{
  const body={student_id:5,course_id:99,grade:80,grade_type:"examen"};
  assert.equal((await request("/api/grades",2,body)).status,403);
  assert.ok(calls.some(([sql])=>sql.includes("teacher_id")&&sql.includes("enrollments")));
  for(const grade of [-1,101,"NaN",""]) assert.equal((await request("/api/grades",2,{...body,grade})).status,400);
});
test("reservation edit reconciles installments, locks parent and preserves original initial payment",async()=>{
  queryHandler=async(sql,params)=>{
    if(sql.includes("SELECT tt.cost, tt.status"))return rows({cost:"100.00",status:"programado"});
    if(sql.includes("SELECT * FROM temple_attendance"))return rows({id:7,user_id:5,trip_id:1});
    if(sql.includes("SUM(payment_amount)"))return rows({total:"30.00",count:2});
    if(sql.includes("UPDATE temple_attendance"))return rows({id:7,advance_payment:params[3],pending_payment:params[4]});
    return rows();
  };
  const body={user_id:5,trip_id:1,register_date:"2026-01-01",initial_payment:20};
  const response=await request("/api/trip-reservations/7",1,body,"PUT");
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:7,advance_payment:50,pending_payment:50});
  assert.ok(transaction.some(([sql])=>sql.includes("temple_attendance")&&sql.includes("FOR UPDATE")));
  assert.ok(transaction.some(([sql])=>sql==="COMMIT"));assert.equal(transaction.at(-1)[0],"RELEASE");
  transaction=[];
  assert.equal((await request("/api/trip-reservations/7",1,{...body,user_id:6},"PUT")).status,400);
  assert.ok(transaction.some(([sql])=>sql==="ROLLBACK"));assert.ok(!transaction.some(([sql])=>sql.startsWith("UPDATE")));
});
test("negative, excessive and duplicate reservations never commit",async()=>{
  queryHandler=async(sql)=>sql.includes("SELECT tt.cost, tt.status")?rows({cost:100,status:"programado"}):rows();
  const body={user_id:5,trip_id:1,register_date:"2026-01-01"};
  for(const amount of [-1,101,1.001]) {
    transaction=[];assert.equal((await request("/api/trip-reservations",1,{...body,initial_payment:amount})).status,400);
    assert.ok(!transaction.some(([sql])=>sql==="COMMIT"));
  }
  queryHandler=async(sql)=>sql.includes("SELECT tt.cost, tt.status")?rows({cost:100,status:"programado"}):sql.includes("SELECT id FROM temple_attendance")?rows({id:7}):rows();
  assert.equal((await request("/api/trip-reservations",1,{...body,initial_payment:1})).status,400);
});
test("reservation with payments cannot be deleted",async()=>{
  queryHandler=async(sql)=>sql.includes("SELECT id,advance_payment FROM temple_attendance")||sql.includes("SELECT id FROM temple_amortizations")?rows({id:7}):rows();
  assert.equal((await request("/api/trip-reservations/7",1,undefined,"DELETE")).status,400);
  assert.ok(!transaction.some(([sql])=>sql.startsWith("DELETE")));
});
test("pagination caps size and never interpolates malicious sort input",async()=>{
  queryHandler=async(sql)=>sql.includes("WITH filtered")?rows({items:[],total:0,total_paid:0,total_pending:0}):rows();
  const response=await request("/api/trip-reservations?limit=999&sort=DROP%20TABLE%20users",1);
  assert.equal(response.status,200);assert.equal((await response.json()).limit,100);
  const [sql,params]=calls.find(([sql])=>sql.includes("WITH filtered"));assert.ok(!sql.includes("DROP TABLE"));assert.deepEqual(params,[100,0]);
});
test("role transition refuses loss of academic history or assigned courses",async()=>{
  for(const role of ["teacher","student"]) {
    const client={query:async(sql)=>sql.includes("SELECT role FROM users")?rows({role:role==="student"?"teacher":"student"}):sql.includes("SELECT 1 FROM students")||sql.includes("SELECT id FROM courses")?rows({id:1}):rows()};
    await assert.rejects(()=>prepareRoleChange(client,3,role));
  }
});
test("pool acquisition failure returns HTTP 500 promptly without hanging",async()=>{
  connectError=true;
  const originalError=console.error; console.error=()=>undefined;
  let response;
  try { response=await request("/api/trip-reservations",1,{user_id:5,trip_id:1,initial_payment:0,register_date:"2026-01-01"}); }
  finally { console.error=originalError; }
  assert.equal(response.status,500);assert.equal((await response.json()).message,"Error interno del servidor");
});

test("concurrent installments cannot overpay a reservation",async()=>{
  let advance=0,pending=100,chain=Promise.resolve(),paymentId=0;
  pool.connect=async()=>{
    let unlock;
    return {release(){if(unlock){unlock();unlock=null;}},async query(sql,params=[]){
      if(sql.includes("SELECT advance_payment, pending_payment")) {
        const previous=chain;chain=new Promise(resolve=>{unlock=resolve;});await previous;
        return rows({advance_payment:advance,pending_payment:pending});
      }
      if(sql.includes("INSERT INTO temple_amortizations"))return rows({id:++paymentId,payment_amount:params[1]});
      if(sql.includes("UPDATE temple_attendance")){advance=params[0];pending=params[1];}
      if(sql==="COMMIT"||sql==="ROLLBACK"){if(unlock){unlock();unlock=null;}}
      return rows();
    }};
  };
  const body={attendance_id:7,payment_amount:60,payment_date:"2026-01-01",payment_type:"efectivo"};
  const responses=await Promise.all([request("/api/temple-amortizations",1,body),request("/api/temple-amortizations",1,body)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,400]);assert.equal(advance,60);assert.equal(pending,40);assert.equal(paymentId,1);
});
test("teacher can create grades for an enrolled student of an assigned course",async()=>{
  queryHandler=async(sql,params)=>sql.includes("INSERT INTO grades")?rows({id:9,student_id:params[0],course_id:params[1],grade:params[2]}):rows();
  const response=await request("/api/grades",2,{student_id:5,course_id:1,grade:85,grade_type:"examen"});
  assert.equal(response.status,201);assert.equal((await response.json()).grade,85);
});
test("changing trip cost reconciles balances and refuses a cost below payments",async()=>{
  queryHandler=async(sql,params)=>{
    if(sql.includes("SELECT id FROM temple_trips"))return rows({id:1});
    if(sql.includes("SELECT id,advance_payment"))return rows({id:7,advance_payment:50});
    if(sql.includes("UPDATE temple_trips"))return rows({id:1,cost:params[3]});
    return rows();
  };
  const body={temple_id:1,date:"2026-12-01",status:"programado",cost:120};
  assert.equal((await request("/api/temple-trips/1",1,body,"PUT")).status,200);
  assert.ok(transaction.some(([sql,params])=>sql.includes("pending_payment=$1-advance_payment")&&params[0]===120));
  transaction=[];
  assert.equal((await request("/api/temple-trips/1",1,{...body,cost:40},"PUT")).status,400);
  assert.ok(!transaction.some(([sql])=>sql.startsWith("UPDATE")));
});

test("business-day validation follows Argentina rather than UTC",()=>{
 const {businessDate}=require("../dist/utils/businessDate");assert.equal(businessDate(new Date("2026-11-01T01:30:00Z")),"2026-10-31");
});
test("proxy trust is explicit and cannot be enabled by a forwarded header",()=>{
 const express=require("express"),{configureProxy}=require("../dist/middleware/loginLimits");
 const app=express(),render=process.env.RENDER;delete process.env.RENDER;
 configureProxy(app,"");assert.equal(app.get("trust proxy"),false);
 configureProxy(app,"loopback, 10.0.0.0/8");assert.deepEqual(app.get("trust proxy"),["loopback","10.0.0.0/8"]);
 if(render!==undefined)process.env.RENDER=render;
});
