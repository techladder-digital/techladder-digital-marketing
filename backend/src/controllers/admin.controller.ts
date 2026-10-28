import { Request, Response } from 'express';
import { withTransaction } from '../config/database';
import { env } from '../config/env';
import { auditRepository } from '../repositories/audit.repository';
import { enquiryRepository } from '../repositories/enquiry.repository';
import { feedbackRepository } from '../repositories/feedback.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { portfolioRepository } from '../repositories/portfolio.repository';
import { serviceRepository } from '../repositories/service.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { socialRepository } from '../repositories/social.repository';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import { notificationService } from '../services/notification.service';
import { API_SUPPORTED_PLATFORMS, socialSyncService } from '../services/social-sync.service';
import { ApiError } from '../utils/api-error';
import { ok, paginationMeta } from '../utils/response';
import { idParam } from '../validators/common';
import { listEnquiriesQuery, updateEnquiryStatusSchema } from '../validators/enquiry.validator';
import { listFeedbackQuery, moderateFeedbackSchema } from '../validators/feedback.validator';
import { parse } from '../validators/parse';
import { portfolioSchema } from '../validators/portfolio.validator';
import { serviceSchema, slugify } from '../validators/service.validator';
import { PUBLIC_SETTING_KEYS, settingsSchema } from '../validators/settings.validator';
import { updateSocialLinkSchema } from '../validators/social.validator';

const adminId = (req: Request) => req.admin!.id;

export const adminController = {
  // ------------------------------------------------------------ dashboard
  async dashboard(_req: Request, res: Response) {
    const [enquiries, notifications, feedback, publishedProjects] = await Promise.all([
      enquiryRepository.counts(),
      notificationRepository.countOutstanding(),
      feedbackRepository.counts(),
      portfolioRepository.countPublished(),
    ]);
    ok(res, {
      totalEnquiries: enquiries.total,
      newEnquiries: enquiries.new,
      enquiriesLast7Days: enquiries.last7Days,
      pendingNotifications: notifications.pending,
      failedNotifications: notifications.failed,
      approvedFeedback: feedback.approved,
      pendingFeedback: feedback.pending,
      publishedProjects,
    });
  },

  async integrations(_req: Request, res: Response) {
    const [lastEmail, lastWhatsapp] = await Promise.all([
      notificationRepository.lastOutcomeByChannel('email'),
      notificationRepository.lastOutcomeByChannel('whatsapp'),
    ]);
    // Only booleans and outcomes — never credentials.
    ok(res, {
      email: { configured: emailService.isConfigured(), lastOutcome: lastEmail },
      whatsapp: {
        configured: env.whatsappEnabled,
        webhookConfigured: Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET),
        lastOutcome: lastWhatsapp,
      },
      socialApis: {
        youtube: Boolean(env.YOUTUBE_API_KEY),
        meta: Boolean(env.META_GRAPH_ACCESS_TOKEN),
        supportedPlatforms: API_SUPPORTED_PLATFORMS,
      },
    });
  },

  async verifyEmail(req: Request, res: Response) {
    const result = await emailService.verifyConnection();
    await auditService.log(adminId(req), 'integration.email_verify', 'integration', 'email');
    ok(res, result);
  },

  async auditLogs(_req: Request, res: Response) {
    ok(res, await auditRepository.listRecent(100));
  },

  // ------------------------------------------------------------ enquiries
  async listEnquiries(req: Request, res: Response) {
    const q = parse(listEnquiriesQuery, req.query);
    const { items, total } = await enquiryRepository.list(q);
    ok(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  },

  async getEnquiry(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const enquiry = await enquiryRepository.findById(id);
    if (!enquiry) throw ApiError.notFound('Enquiry not found');
    const notifications = await notificationRepository.findByEnquiry(id);
    await auditService.log(adminId(req), 'enquiry.view', 'enquiry', id);
    ok(res, { ...enquiry, notifications });
  },

  async updateEnquiryStatus(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const { status } = parse(updateEnquiryStatusSchema, req.body);
    if (!(await enquiryRepository.updateStatus(id, status))) throw ApiError.notFound('Enquiry not found');
    await auditService.log(adminId(req), `enquiry.status.${status}`, 'enquiry', id);
    ok(res, { id, status });
  },

  async retryNotification(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const status = await notificationService.retryOne(id);
    if (status === null) throw ApiError.notFound('Notification not found');
    await auditService.log(adminId(req), 'notification.retry', 'notification_log', id);
    ok(res, { id, status });
  },

  // ------------------------------------------------------------- feedback
  async listFeedback(req: Request, res: Response) {
    const q = parse(listFeedbackQuery, req.query);
    const { items, total } = await feedbackRepository.list(q.status, q.page, q.pageSize);
    ok(res, items, 200, paginationMeta(q.page, q.pageSize, total));
  },

  async moderateFeedback(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const { status } = parse(moderateFeedbackSchema, req.body);
    const existing = await feedbackRepository.findById(id);
    if (!existing) throw ApiError.notFound('Feedback not found');
    if (status === 'approved' && !existing.consentToPublish) {
      throw ApiError.badRequest('This customer did not consent to public display, so it cannot be approved for publication.');
    }
    await feedbackRepository.setModeration(id, status);
    await auditService.log(adminId(req), `feedback.${status}`, 'feedback', id);
    ok(res, { id, moderationStatus: status });
  },

  // ------------------------------------------------------------ portfolio
  async listPortfolio(_req: Request, res: Response) {
    ok(res, await portfolioRepository.listAll());
  },

  async createPortfolio(req: Request, res: Response) {
    const input = parse(portfolioSchema, req.body);
    const id = await portfolioRepository.create(input);
    await auditService.log(adminId(req), 'portfolio.create', 'portfolio_project', id);
    ok(res, await portfolioRepository.findById(id), 201);
  },

  async updatePortfolio(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const input = parse(portfolioSchema, req.body);
    if (!(await portfolioRepository.update(id, input))) throw ApiError.notFound('Project not found');
    await auditService.log(adminId(req), 'portfolio.update', 'portfolio_project', id);
    ok(res, await portfolioRepository.findById(id));
  },

  async deletePortfolio(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    if (!(await portfolioRepository.remove(id))) throw ApiError.notFound('Project not found');
    await auditService.log(adminId(req), 'portfolio.delete', 'portfolio_project', id);
    ok(res, { id, deleted: true });
  },

  // ------------------------------------------------------------- services
  async listServices(_req: Request, res: Response) {
    ok(res, await serviceRepository.listAll());
  },

  async createService(req: Request, res: Response) {
    const input = parse(serviceSchema, req.body);
    const slug = input.slug || slugify(input.title);
    if (!slug) throw ApiError.badRequest('Could not derive a slug from the title');
    const id = await serviceRepository.create({ ...input, slug });
    await auditService.log(adminId(req), 'service.create', 'service', id);
    ok(res, await serviceRepository.findById(id), 201);
  },

  async updateService(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const input = parse(serviceSchema, req.body);
    const slug = input.slug || slugify(input.title);
    if (!(await serviceRepository.update(id, { ...input, slug }))) throw ApiError.notFound('Service not found');
    await auditService.log(adminId(req), 'service.update', 'service', id);
    ok(res, await serviceRepository.findById(id));
  },

  async deleteService(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    if (!(await serviceRepository.remove(id))) throw ApiError.notFound('Service not found');
    await auditService.log(adminId(req), 'service.delete', 'service', id);
    ok(res, { id, deleted: true });
  },

  // --------------------------------------------------------- social links
  async listSocialLinks(_req: Request, res: Response) {
    ok(res, await socialRepository.listAll());
  },

  async updateSocialLink(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const input = parse(updateSocialLinkSchema, req.body);
    const existing = await socialRepository.findById(id);
    if (!existing) throw ApiError.notFound('Social link not found');
    if (input.countType === 'api' && !API_SUPPORTED_PLATFORMS.includes(existing.platform)) {
      throw ApiError.badRequest(`Automatic counts are not available for ${existing.platform}. Use a manual count.`);
    }
    if (input.countType === 'api' && !input.apiAccountId) {
      throw new ApiError(422, 'Please correct the highlighted fields', 'VALIDATION_ERROR', {
        apiAccountId: 'An API account/channel id is required for API counts',
      });
    }
    // API counts are written only by the sync job — admins cannot type a figure and call it "verified".
    const followerCount = input.countType === 'api' ? existing.followerCount : input.followerCount;
    const countChanged = input.countType === 'manual' && followerCount !== existing.followerCount;
    await socialRepository.update(id, { ...input, followerCount }, countChanged);
    await auditService.log(adminId(req), 'social_link.update', 'social_link', id);
    ok(res, await socialRepository.findById(id));
  },

  async syncSocialCounts(req: Request, res: Response) {
    const results = await socialSyncService.syncAll();
    await auditService.log(adminId(req), 'social_link.sync', 'social_link', 'all');
    ok(res, results);
  },

  // -------------------------------------------------------------- settings
  async getSettings(_req: Request, res: Response) {
    ok(res, await settingsRepository.getMany(PUBLIC_SETTING_KEYS));
  },

  async updateSettings(req: Request, res: Response) {
    const input = parse(settingsSchema, req.body);
    // Only keys actually present in the request are written (partial update).
    const body = (req.body ?? {}) as Record<string, unknown>;
    const entries = (Object.entries(input) as [string, string | null][]).filter(([k]) =>
      Object.prototype.hasOwnProperty.call(body, k),
    );
    if (entries.length === 0) throw ApiError.badRequest('No settings supplied');
    await withTransaction(async (conn) => {
      for (const [key, value] of entries) await settingsRepository.upsert(conn, key, value);
    });
    await auditService.log(adminId(req), 'settings.update', 'site_settings', entries.map(([k]) => k).join(',').slice(0, 64));
    ok(res, await settingsRepository.getMany(PUBLIC_SETTING_KEYS));
  },
};

