import type { PoolConnection } from 'mysql2/promise';
import { execute, query } from '../config/database';

export const settingsRepository = {
  async getMany(keys: readonly string[]): Promise<Record<string, string | null>> {
    if (keys.length === 0) return {};
    const placeholders = keys.map(() => '?').join(', ');
    const rows = await query<{ setting_key: string; setting_value: string | null }>(
      `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${placeholders})`,
      [...keys],
    );
    const out: Record<string, string | null> = {};
    for (const k of keys) out[k] = null;
    for (const r of rows) out[r.setting_key] = r.setting_value === '' ? null : r.setting_value;
    return out;
  },

  async upsert(conn: PoolConnection, key: string, value: string | null): Promise<void> {
    await execute(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, value],
      conn,
    );
  },
};
