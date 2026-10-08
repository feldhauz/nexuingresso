import "server-only";
import { connection } from "next/server";
import { SCHEMA } from "./schema";

// Com DATABASE_URL, usa o PostgreSQL indicado. Sem ela, usa o PGlite (PostgreSQL embutido)
// gravando em .data/, para o site rodar no computador sem instalar nada.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

interface Driver extends Db {
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

async function connect(): Promise<Driver> {
  let driver: Driver;

  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    driver = {
      query: async (text, params) => (await pool.query(text, params as unknown[])).rows,
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({
            query: async (text, params) => (await client.query(text, params as unknown[])).rows,
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
    await pool.query(SCHEMA);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(".data", { recursive: true });
    const pg = new PGlite(".data/pg");
    driver = {
      query: async <T>(text: string, params?: unknown[]) =>
        (await pg.query<T>(text, params as unknown[])).rows,
      transaction: <T>(fn: (tx: Db) => Promise<T>) =>
        pg.transaction((tx) =>
          fn({
            query: async <R>(text: string, params?: unknown[]) =>
              (await tx.query<R>(text, params as unknown[])).rows,
          }),
        ) as Promise<T>,
    };
    await pg.exec(SCHEMA);
  }

  return driver;
}

// Uma conexão por processo, inclusive entre recargas do modo de desenvolvimento.
const globalForDb = globalThis as unknown as { colajaDb?: Promise<Driver> };

async function driver(): Promise<Driver> {
  // Toda leitura do banco acontece no momento do pedido, nunca na pré-renderização.
  await connection();
  globalForDb.colajaDb ??= connect().then(async (db) => {
    const { seed } = await import("./seed");
    await seed(db);
    return db;
  });
  return globalForDb.colajaDb;
}

export async function query<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await driver()).query<T>(text, params);
}

export async function queryOne<T = Row>(text: string, params?: unknown[]): Promise<T | undefined> {
  return (await query<T>(text, params))[0];
}

export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  return (await driver()).transaction(fn);
}
