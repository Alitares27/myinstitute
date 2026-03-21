import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PG:', err);
});