require("dotenv").config();
const {readFileSync}=require("node:fs");
const {pool}=require("../dist/models/db");
(async()=>{
 const client=await pool.connect();
 try {
  await client.query("SET lock_timeout = '5s'");
  await client.query(readFileSync(require("node:path").join(__dirname,"../migrations/security_and_history.sql"),"utf8"));
  await client.query(readFileSync(require("node:path").join(__dirname,"../migrations/baptism_agendas.sql"),"utf8"));
  console.log("Security, history and agendas migrations applied.");
 } catch(error) {await client.query("ROLLBACK").catch(()=>{});throw error;}
 finally {client.release();await pool.end();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
