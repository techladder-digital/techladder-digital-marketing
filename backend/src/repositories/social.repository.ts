import { execute, query } from '../config/database';
import { SocialLink, SocialPlatform } from '../types/models';
import { UpdateSocialLinkInput } from '../validators/social.validator';

interface SocialRow {
  id: number;
  platform: SocialPlatform;
  profile_name: string | null;
  profile_url: string | null;
  follower_count: number | null;
  count_type: 'manual' | 'api';
  api_account_id: string | null;
  last_count_update: Date | null;
  last_sync_error: string | null;
  is_enabled: number;
  show_follower_count: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

const toLink = (r: SocialRow): SocialLink => ({
  id: r.id,
  platform: r.platform,
  profileName: r.profile_name,
  profileUrl: r.profile_url,
  followerCount: r.follower_count === null ? null : Number(r.follower_count),
  countType: r.count_type,
  apiAccountId: r.api_account_id,
  lastCountUpdate: r.last_count_update,
  lastSyncError: r.last_sync_error,
  isEnabled: r.is_enabled === 1,
  showFollowerCount: r.show_follower_count === 1,
  displayOrder: r.display_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const socialRepository = {
  async listAll(): Promise<SocialLink[]> {
    const rows = await query<SocialRow>('SELECT * FROM social_links ORDER BY display_order, id');
    return rows.map(toLink);
  },

  async findById(id: number): Promise<SocialLink | null> {
    const rows = await query<SocialRow>('SELECT * FROM social_links WHERE id = ? LIMIT 1', [id]);
    return rows[0] ? toLink(rows[0]) : null;
  },

  /**
   * Admin update. When a manual count changes, last_count_update is stamped.
   * Switching to 'api' keeps the last known figure until the next successful sync.
   */
  async update(id: number, u: UpdateSocialLinkInput, countChanged: boolean): Promise<boolean> {
    const r = await execute(
      `UPDATE social_links
          SET profile_name = ?, profile_url = ?, follower_count = ?, count_type = ?, api_account_id = ?,
              is_enabled = ?, show_follower_count = ?, display_order = COALESCE(?, display_order),
              last_count_update = CASE WHEN ? = 1 THEN UTC_TIMESTAMP() ELSE last_count_update END
        WHERE id = ?`,
      [
        u.profileName, u.profileUrl, u.followerCount, u.countType, u.apiAccountId,
        u.isEnabled ? 1 : 0, u.showFollowerCount ? 1 : 0, u.displayOrder ?? null, countChanged ? 1 : 0, id,
      ],
    );
    return r.affectedRows > 0;
  },

  async recordApiCount(id: number, count: number): Promise<void> {
    await execute(
      'UPDATE social_links SET follower_count = ?, last_count_update = UTC_TIMESTAMP(), last_sync_error = NULL WHERE id = ?',
      [count, id],
    );
  },

  async recordSyncError(id: number, error: string): Promise<void> {
    await execute('UPDATE social_links SET last_sync_error = ? WHERE id = ?', [error.slice(0, 500), id]);
  },
};
