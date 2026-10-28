import { auditRepository } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

/**
 * Records sensitive admin actions. Only identifiers are stored —
 * never passwords, tokens, or the content of enquiries/settings.
 * Audit failures are logged but never break the user's request.
 */
export const auditService = {
  async log(adminId: number | null, action: string, entityType?: string, entityId?: number | string) {
    try {
      await auditRepository.insert(adminId, action, entityType ?? null, entityId === undefined ? null : String(entityId));
    } catch (err) {
      logger.error('Failed to write audit log', { action, error: err instanceof Error ? err.message : String(err) });
    }
  },
};
