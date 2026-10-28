import { Request, Response } from 'express';
import { pingDatabase } from '../config/database';
import { feedbackRepository } from '../repositories/feedback.repository';
import { portfolioRepository } from '../repositories/portfolio.repository';
import { serviceRepository } from '../repositories/service.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { socialRepository } from '../repositories/social.repository';
import { enquiryService } from '../services/enquiry.service';
import { socialSyncService } from '../services/social-sync.service';
import { ApiError } from '../utils/api-error';
import { ok } from '../utils/response';
import { idParam } from '../validators/common';
import { createEnquirySchema } from '../validators/enquiry.validator';
import { createFeedbackSchema } from '../validators/feedback.validator';
import { parse } from '../validators/parse';
import { publicPortfolioQuery } from '../validators/portfolio.validator';
import { publicServicesQuery } from '../validators/service.validator';
import { PUBLIC_SETTING_KEYS } from '../validators/settings.validator';

export const publicController = {
  async health(_req: Request, res: Response) {
    const database = await pingDatabase();
    res.status(database ? 200 : 503).json({
      success: database,
      data: { status: database ? 'ok' : 'degraded', database: database ? 'up' : 'down', time: new Date().toISOString() },
    });
  },

  async createEnquiry(req: Request, res: Response) {
    const input = parse(createEnquirySchema, req.body);
    const result = await enquiryService.submit(input);
    ok(res, result, 201);
  },

  async createFeedback(req: Request, res: Response) {
    const { website: _honeypot, ...input } = parse(createFeedbackSchema, req.body);
    const id = await feedbackRepository.insert(input);
    ok(res, { id, moderationStatus: 'pending' }, 201);
  },

  async publicFeedback(req: Request, res: Response) {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const items = await feedbackRepository.listPublic(limit);
    // Only fields suitable for publication are returned.
    ok(
      res,
      items.map((f) => ({
        id: f.id,
        customerName: f.customerName,
        businessName: f.businessName,
        serviceCategory: f.serviceCategory,
        projectName: f.projectName,
        rating: f.rating,
        feedbackMessage: f.feedbackMessage,
        createdAt: f.createdAt,
      })),
    );
  },

  async listPortfolio(req: Request, res: Response) {
    const q = parse(publicPortfolioQuery, req.query);
    ok(res, await portfolioRepository.listPublished(q));
  },

  async getPortfolio(req: Request, res: Response) {
    const { id } = parse(idParam, req.params);
    const project = await portfolioRepository.findPublishedById(id);
    if (!project) throw ApiError.notFound('Project not found');
    ok(res, project);
  },

  async listServices(req: Request, res: Response) {
    const { category } = parse(publicServicesQuery, req.query);
    ok(res, await serviceRepository.listActive(category));
  },

  async socialLinks(_req: Request, res: Response) {
    ok(res, socialSyncService.toPublic(await socialRepository.listAll()));
  },

  async publicSettings(_req: Request, res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    ok(res, await settingsRepository.getMany(PUBLIC_SETTING_KEYS));
  },
};
