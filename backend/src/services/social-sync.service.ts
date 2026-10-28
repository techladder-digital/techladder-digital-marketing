import { env } from '../config/env';
import { socialRepository } from '../repositories/social.repository';
import { PublicSocialLink, SocialLink, SocialPlatform } from '../types/models';
import { logger, safeErrorMessage } from '../utils/logger';

/**
 * Follower counts from OFFICIAL platform APIs only. No scraping.
 *
 * Supported (when credentials + account id are configured):
 *   - YouTube   : YouTube Data API v3 channels.list (public subscriberCount), needs YOUTUBE_API_KEY + channel id
 *   - Facebook  : Graph API Page fields=followers_count, needs META_GRAPH_ACCESS_TOKEN + Page id
 *   - Instagram : Graph API IG User fields=followers_count (professional account), needs META_GRAPH_ACCESS_TOKEN + IG user id
 * Not supported for automatic counts: WhatsApp, Threads, LinkedIn — maintain these manually.
 */

type Fetcher = typeof fetch;

export const API_SUPPORTED_PLATFORMS: SocialPlatform[] = ['youtube', 'facebook', 'instagram'];

async function getJson(url: string, fetchImpl: Fetcher, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(10_000) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function fetchFollowerCount(link: SocialLink, fetchImpl: Fetcher = fetch): Promise<number> {
  const id = link.apiAccountId;
  if (!id) throw new Error('API account id is not set');

  switch (link.platform) {
    case 'youtube': {
      if (!env.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY is not configured');
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(id)}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`;
      const body = (await getJson(url, fetchImpl)) as {
        items?: { statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }[];
      };
      const stats = body.items?.[0]?.statistics;
      if (!stats) throw new Error('Channel not found');
      if (stats.hiddenSubscriberCount) throw new Error('Subscriber count is hidden on this channel');
      const n = Number(stats.subscriberCount);
      if (!Number.isFinite(n)) throw new Error('Subscriber count not available');
      return n;
    }
    case 'facebook':
    case 'instagram': {
      if (!env.META_GRAPH_ACCESS_TOKEN) throw new Error('META_GRAPH_ACCESS_TOKEN is not configured');
      const url = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${encodeURIComponent(id)}?fields=followers_count`;
      const body = (await getJson(url, fetchImpl, { Authorization: `Bearer ${env.META_GRAPH_ACCESS_TOKEN}` })) as {
        followers_count?: number;
      };
      if (typeof body.followers_count !== 'number') throw new Error('followers_count not returned (check permissions)');
      return body.followers_count;
    }
    default:
      throw new Error(`No official follower-count API integration for ${link.platform}; maintain the count manually`);
  }
}

export const socialSyncService = {
  /** Syncs every enabled platform set to count_type = 'api'. Failures keep the last known figure. */
  async syncAll(fetchImpl: Fetcher = fetch): Promise<{ platform: SocialPlatform; ok: boolean; error?: string }[]> {
    const links = await socialRepository.listAll();
    const results: { platform: SocialPlatform; ok: boolean; error?: string }[] = [];
    for (const link of links.filter((l) => l.isEnabled && l.countType === 'api')) {
      try {
        const count = await fetchFollowerCount(link, fetchImpl);
        await socialRepository.recordApiCount(link.id, count);
        results.push({ platform: link.platform, ok: true });
      } catch (err) {
        const message = safeErrorMessage(err, 300);
        await socialRepository.recordSyncError(link.id, message);
        logger.warn('Follower count sync failed', { platform: link.platform, error: message });
        results.push({ platform: link.platform, ok: false, error: message });
      }
    }
    return results;
  },

  /** Public projection: enabled platforms with a URL; count only when the admin allows it. */
  toPublic(links: SocialLink[]): PublicSocialLink[] {
    return links
      .filter((l) => l.isEnabled && l.profileUrl)
      .map((l) => {
        const showCount = l.showFollowerCount && l.followerCount !== null && l.lastCountUpdate !== null;
        return {
          platform: l.platform,
          profileName: l.profileName,
          profileUrl: l.profileUrl!,
          followerCount: showCount ? l.followerCount : null,
          countSource: showCount ? l.countType : null,
          lastCountUpdate: showCount ? l.lastCountUpdate : null,
        };
      });
  },
};
