import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) databaseUrl?.searchParams.delete(key);
export const pool = new Pool({
  connectionString: databaseUrl?.toString(),
  ssl: process.env.PGSSL === "disable" ? false : {
    rejectUnauthorized: true,
    ...(process.env.PGSSL_CA ? { ca: process.env.PGSSL_CA.replace(/\\n/g, "\n") } : {}),
  },
  statement_timeout: 15000,
  query_timeout: 20000,
  max: 15,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PG:', err.message);
});

