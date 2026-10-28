import { execute, query, SqlParam } from '../config/database';
import { PortfolioCategory, PortfolioProject } from '../types/models';
import { PortfolioInput } from '../validators/portfolio.validator';

interface PortfolioRow {
  id: number;
  title: string;
  category: PortfolioCategory;
  description: string;
  thumbnail_url: string | null;
  video_url: string | null;
  project_url: string | null;
  is_sample: number;
  is_featured: number;
  is_published: number;
  created_at: Date;
  updated_at: Date;
}

const toProject = (r: PortfolioRow): PortfolioProject => ({
  id: r.id,
  title: r.title,
  category: r.category,
  description: r.description,
  thumbnailUrl: r.thumbnail_url,
  videoUrl: r.video_url,
  projectUrl: r.project_url,
  isSample: r.is_sample === 1,
  isFeatured: r.is_featured === 1,
  isPublished: r.is_published === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const portfolioRepository = {
  /** Only published projects are ever returned by this method. */
  async listPublished(filter: { category?: PortfolioCategory; featured?: boolean; limit: number }): Promise<PortfolioProject[]> {
    const where = ['is_published = 1'];
    const params: SqlParam[] = [];
    if (filter.category) {
      where.push('category = ?');
      params.push(filter.category);
    }
    if (filter.featured !== undefined) {
      where.push('is_featured = ?');
      params.push(filter.featured ? 1 : 0);
    }
    const rows = await query<PortfolioRow>(
      `SELECT * FROM portfolio_projects WHERE ${where.join(' AND ')}
        ORDER BY is_featured DESC, created_at DESC LIMIT ?`,
      [...params, String(filter.limit)],
    );
    return rows.map(toProject);
  },

  async findPublishedById(id: number): Promise<PortfolioProject | null> {
    const rows = await query<PortfolioRow>('SELECT * FROM portfolio_projects WHERE id = ? AND is_published = 1 LIMIT 1', [id]);
    return rows[0] ? toProject(rows[0]) : null;
  },

  async listAll(): Promise<PortfolioProject[]> {
    const rows = await query<PortfolioRow>('SELECT * FROM portfolio_projects ORDER BY created_at DESC, id DESC');
    return rows.map(toProject);
  },

  async findById(id: number): Promise<PortfolioProject | null> {
    const rows = await query<PortfolioRow>('SELECT * FROM portfolio_projects WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toProject(rows[0]) : null;
  },

  async create(p: PortfolioInput): Promise<number> {
    const r = await execute(
      `INSERT INTO portfolio_projects
        (title, category, description, thumbnail_url, video_url, project_url, is_sample, is_featured, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.title, p.category, p.description, p.thumbnailUrl, p.videoUrl, p.projectUrl, p.isSample ? 1 : 0, p.isFeatured ? 1 : 0, p.isPublished ? 1 : 0],
    );
    return r.insertId;
  },

  async update(id: number, p: PortfolioInput): Promise<boolean> {
    const r = await execute(
      `UPDATE portfolio_projects
          SET title = ?, category = ?, description = ?, thumbnail_url = ?, video_url = ?, project_url = ?,
              is_sample = ?, is_featured = ?, is_published = ?
        WHERE id = ?`,
      [p.title, p.category, p.description, p.thumbnailUrl, p.videoUrl, p.projectUrl, p.isSample ? 1 : 0, p.isFeatured ? 1 : 0, p.isPublished ? 1 : 0, id],
    );
    return r.affectedRows > 0;
  },

  async remove(id: number): Promise<boolean> {
    const r = await execute('DELETE FROM portfolio_projects WHERE id = ?', [id]);
    return r.affectedRows > 0;
  },

  async countPublished(): Promise<number> {
    const [row] = await query<{ c: number }>('SELECT COUNT(*) AS c FROM portfolio_projects WHERE is_published = 1');
    return Number(row.c);
  },
};
