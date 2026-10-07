import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 15,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PG:', err.message);
});

