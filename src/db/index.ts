import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __nikhatuPool?: Pool;
  __nikhatuDb?: NodePgDatabase;
};

// Lazy init: DATABASE_URL is only checked when a query actually runs,
// so `next build` no longer crashes when the env var isn't set at build time.
function getDb(): NodePgDatabase {
  if (globalForDb.__nikhatuDb) return globalForDb.__nikhatuDb;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = globalForDb.__nikhatuPool ?? new Pool({ connectionString: databaseUrl });
  globalForDb.__nikhatuPool = pool;
  globalForDb.__nikhatuDb = drizzle(pool);
  return globalForDb.__nikhatuDb;
}

export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
