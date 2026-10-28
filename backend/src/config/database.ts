import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from './env';

/** Values accepted as SQL parameters. Every query in this codebase uses placeholders. */
export type SqlParam = string | number | boolean | Date | null | Buffer;

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      timezone: 'Z',
      charset: 'utf8mb4',
      multipleStatements: false,
      ssl: env.DB_SSL ? { rejectUnauthorized: true } : undefined,
    });
    // Keep every session in UTC so TIMESTAMP/DATETIME values round-trip correctly.
    pool.pool.on('connection', (conn) => {
      conn.query("SET time_zone = '+00:00'");
    });
  }
  return pool;
}

type Executor = Pick<Pool, 'execute'> | Pick<PoolConnection, 'execute'>;

/** SELECT helper — returns typed rows. */
export async function query<T>(sql: string, params: SqlParam[] = [], conn?: Executor): Promise<T[]> {
  const executor = conn ?? getPool();
  const [rows] = await executor.execute<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

/** INSERT/UPDATE/DELETE helper — returns the result header (insertId, affectedRows). */
export async function execute(sql: string, params: SqlParam[] = [], conn?: Executor): Promise<ResultSetHeader> {
  const executor = conn ?? getPool();
  const [result] = await executor.execute<ResultSetHeader>(sql, params);
  return result;
}

/** Runs fn inside a transaction; commits on success, rolls back on any error. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => undefined);
    throw err;
  } finally {
    conn.release();
  }
}

export async function pingDatabase(): Promise<boolean> {
  try {
    await query('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}
