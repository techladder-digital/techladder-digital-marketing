import { Request, Response } from 'express';
import { env } from '../config/env';
import { notificationRepository } from '../repositories/notification.repository';
import { whatsappService } from '../services/whatsapp.service';
import { logger } from '../utils/logger';

export const webhookController = {
  /** Meta's one-time verification handshake (GET). */
  verifyWhatsapp(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (
      env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      mode === 'subscribe' &&
      token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      typeof challenge === 'string' &&
      /^[A-Za-z0-9_-]{1,200}$/.test(challenge)
    ) {
      return res.status(200).type('text/plain').send(challenge);
    }
    return res.sendStatus(403);
  },

  /** Delivery status updates (POST). Signature-verified; always answers 200 quickly once verified. */
  async receiveWhatsapp(req: Request, res: Response) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!whatsappService.verifySignature(rawBody, req.header('x-hub-signature-256'))) {
      return res.sendStatus(401);
    }
    const updates = whatsappService.parseStatusWebhook(req.body);
    for (const u of updates) {
      try {
        await notificationRepository.applyProviderStatus(u.messageId, u.status, u.error);
      } catch (err) {
        logger.error('Failed to apply WhatsApp status', { error: err instanceof Error ? err.message : String(err) });
      }
    }
    return res.sendStatus(200);
  },
};
