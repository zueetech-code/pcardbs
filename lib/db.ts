import { Pool, types } from "pg";

// ============================================================
// PostgreSQL timestamp parsers
// ============================================================

types.setTypeParser(
  1184,
  (val) => val
); // timestamptz

types.setTypeParser(
  1114,
  (val) => val
); // timestamp

types.setTypeParser(
  1082,
  (val) => val
); // date


// ============================================================
// GLOBAL POOL
// ============================================================
//
// Important for Next.js development.
//
// Next.js hot reload can reload modules.
// Without global storage, every reload can
// create another PostgreSQL connection pool.
//
// ============================================================

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};


// ============================================================
// CREATE OR REUSE POOL
// ============================================================

export const pool =
  globalForPg.pgPool ??
  new Pool({

    host:
      process.env.PG_HOST,

    user:
      process.env.PG_USER,

    password:
      process.env.PG_PASSWORD,

    database:
      process.env.PG_DB,

    port:
      Number(
        process.env.PG_PORT || 5432
      ),

    ssl:
      false,

    // Maximum connections used
    // by this Next.js application.
    max:
      10,

    // Close idle connections after
    // 30 seconds.
    idleTimeoutMillis:
      30000,

    // Don't wait forever for a connection.
    connectionTimeoutMillis:
      10000,

    // Maximum time a query can run.
    statement_timeout:
      300000
  });


// ============================================================
// SAVE POOL GLOBALLY IN DEVELOPMENT
// ============================================================

if (
  process.env.NODE_ENV !== "production"
) {

  globalForPg.pgPool =
    pool;
}


// ============================================================
// OPTIONAL ERROR HANDLER
// ============================================================

pool.on(
  "error",
  (error) => {

    console.error(
      "PostgreSQL pool error:",
      error
    );

  }
);