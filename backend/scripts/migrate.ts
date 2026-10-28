/**
 * Applies SQL migrations in /migrations in filename order and records them in schema_migrations.
 * Already-applied migrations are skipped. Never drops tables.
 *
 *   npm run migrate            (development, via tsx)
 *   npm run migrate:prod       (after npm run build)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env';

function findMigrationsDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'migrations');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error('migrations directory not found');
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true, // trusted, version-controlled SQL files only
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : undefined,
  });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(190) NOT NULL PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await conn.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map((rows as { version: string; checksum: string }[]).map((r) => [r.version, r.checksum]));

    const dir = findMigrationsDir();
    const files = fs.readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
    let count = 0;
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          console.warn(`! ${file} was modified after being applied. Create a new migration instead of editing old ones.`);
        }
        continue;
      }
      console.log(`→ applying ${file}`);
      await conn.query(sql);
      await conn.execute('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [file, checksum]);
      count++;
    }
    console.log(count === 0 ? '✓ database is up to date' : `✓ applied ${count} migration(s)`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
