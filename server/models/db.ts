import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PG:', err.message);
});
