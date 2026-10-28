import { execute, query } from '../config/database';
import { AdminRole } from '../types/models';

export interface AdminRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  is_active: number;
  token_version: number;
  failed_login_count: number;
  locked_until: Date | null;
}

const COLUMNS = 'id, name, email, password_hash, role, is_active, token_version, failed_login_count, locked_until';

export const adminRepository = {
  async findByEmail(email: string): Promise<AdminRow | null> {
    const rows = await query<AdminRow>(`SELECT ${COLUMNS} FROM admins WHERE email = ? LIMIT 1`, [email]);
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<AdminRow | null> {
    const rows = await query<AdminRow>(`SELECT ${COLUMNS} FROM admins WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ?? null;
  },

  async recordFailedLogin(id: number, lockUntil: Date | null): Promise<void> {
    await execute(
      'UPDATE admins SET failed_login_count = failed_login_count + 1, locked_until = COALESCE(?, locked_until) WHERE id = ?',
      [lockUntil, id],
    );
  },

  async recordSuccessfulLogin(id: number): Promise<void> {
    await execute(
      'UPDATE admins SET failed_login_count = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?',
      [id],
    );
  },

  /** Invalidates every token issued to this admin (used by logout). */
  async bumpTokenVersion(id: number): Promise<void> {
    await execute('UPDATE admins SET token_version = token_version + 1 WHERE id = ?', [id]);
  },

  async create(name: string, email: string, passwordHash: string, role: AdminRole): Promise<number> {
    const r = await execute('INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      name,
      email,
      passwordHash,
      role,
    ]);
    return r.insertId;
  },

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await execute(
      'UPDATE admins SET password_hash = ?, token_version = token_version + 1, failed_login_count = 0, locked_until = NULL WHERE id = ?',
      [passwordHash, id],
    );
  },
};
