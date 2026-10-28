import { execute, query, SqlParam } from '../config/database';
import type { MediaKind } from '../services/upload.service';

export interface MediaFile {
  id: number;
  kind: MediaKind;
  originalName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: Date;
}

interface MediaRow {
  id: number;
  kind: MediaKind;
  original_name: string;
  stored_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_name: string | null;
  created_at: Date;
}

const toMedia = (r: MediaRow): MediaFile => ({
  id: r.id,
  kind: r.kind,
  originalName: r.original_name,
  url: r.stored_path,
  mimeType: r.mime_type,
  sizeBytes: Number(r.size_bytes),
  uploadedBy: r.uploaded_by_name,
  createdAt: r.created_at,
});

const SELECT = `SELECT m.id, m.kind, m.original_name, m.stored_path, m.mime_type, m.size_bytes, m.created_at,
                       a.name AS uploaded_by_name
                  FROM media_files m LEFT JOIN admins a ON a.id = m.uploaded_by`;

export const mediaRepository = {
  async insert(f: { kind: MediaKind; originalName: string; storedPath: string; mimeType: string; sizeBytes: number; uploadedBy: number }): Promise<number> {
    const r = await execute(
      'INSERT INTO media_files (kind, original_name, stored_path, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [f.kind, f.originalName, f.storedPath, f.mimeType, f.sizeBytes, f.uploadedBy],
    );
    return r.insertId;
  },

  async findById(id: number): Promise<MediaFile | null> {
    const rows = await query<MediaRow>(`${SELECT} WHERE m.id = ? LIMIT 1`, [id]);
    return rows[0] ? toMedia(rows[0]) : null;
  },

  async list(kind: MediaKind | undefined, page: number, pageSize: number) {
    const params: SqlParam[] = [];
    let where = '';
    if (kind) {
      where = 'WHERE m.kind = ?';
      params.push(kind);
    }
    const [{ total }] = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM media_files m ${where}`, params);
    const rows = await query<MediaRow>(`${SELECT} ${where} ORDER BY m.id DESC LIMIT ? OFFSET ?`, [
      ...params,
      String(pageSize),
      String((page - 1) * pageSize),
    ]);
    return { items: rows.map(toMedia), total: Number(total) };
  },

  async remove(id: number): Promise<boolean> {
    const r = await execute('DELETE FROM media_files WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  /** Where a file is currently used (portfolio, services, settings) — shown before deleting. */
  async usages(url: string): Promise<string[]> {
    const out: string[] = [];
    const p = await query<{ title: string }>(
      'SELECT title FROM portfolio_projects WHERE thumbnail_url = ? OR video_url = ? LIMIT 20',
      [url, url],
    );
    p.forEach((r) => out.push(`Portfolio: ${r.title}`));
    const s = await query<{ title: string }>('SELECT title FROM services WHERE image_url = ? LIMIT 20', [url]);
    s.forEach((r) => out.push(`Service: ${r.title}`));
    const st = await query<{ setting_key: string }>('SELECT setting_key FROM site_settings WHERE setting_value = ? LIMIT 20', [url]);
    st.forEach((r) => out.push(`Website setting: ${r.setting_key}`));
    return out;
  },
};
