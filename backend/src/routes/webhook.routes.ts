import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

router.get('/whatsapp', webhookController.verifyWhatsapp);
router.post('/whatsapp', webhookController.receiveWhatsapp);

export default router;
