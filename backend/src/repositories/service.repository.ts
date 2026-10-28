import { execute, query, SqlParam } from '../config/database';
import { Service, ServiceCategory } from '../types/models';
import { ServiceInput } from '../validators/service.validator';

interface ServiceRow {
  id: number;
  category: ServiceCategory;
  title: string;
  slug: string;
  description: string;
  details: string | null;
  icon: string | null;
  image_url: string | null;
  is_active: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

const toService = (r: ServiceRow): Service => ({
  id: r.id,
  category: r.category,
  title: r.title,
  slug: r.slug,
  description: r.description,
  details: r.details,
  icon: r.icon,
  imageUrl: r.image_url,
  isActive: r.is_active === 1,
  displayOrder: r.display_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const serviceRepository = {
  async listActive(category?: ServiceCategory): Promise<Service[]> {
    const params: SqlParam[] = [];
    let where = 'WHERE is_active = 1';
    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }
    const rows = await query<ServiceRow>(`SELECT * FROM services ${where} ORDER BY category, display_order, id`, params);
    return rows.map(toService);
  },

  async listAll(): Promise<Service[]> {
    const rows = await query<ServiceRow>('SELECT * FROM services ORDER BY category, display_order, id');
    return rows.map(toService);
  },

  async findById(id: number): Promise<Service | null> {
    const rows = await query<ServiceRow>('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toService(rows[0]) : null;
  },

  async create(s: ServiceInput & { slug: string }): Promise<number> {
    const r = await execute(
      `INSERT INTO services (category, title, slug, description, details, icon, image_url, is_active, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.category, s.title, s.slug, s.description, s.details, s.icon, s.imageUrl, s.isActive ? 1 : 0, s.displayOrder],
    );
    return r.insertId;
  },

  async update(id: number, s: ServiceInput & { slug: string }): Promise<boolean> {
    const r = await execute(
      `UPDATE services SET category = ?, title = ?, slug = ?, description = ?, details = ?, icon = ?,
              image_url = ?, is_active = ?, display_order = ? WHERE id = ?`,
      [s.category, s.title, s.slug, s.description, s.details, s.icon, s.imageUrl, s.isActive ? 1 : 0, s.displayOrder, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id: number): Promise<boolean> {
    const r = await execute('DELETE FROM services WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },
};
