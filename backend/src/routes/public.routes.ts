import { Router } from 'express';
import { publicController } from '../controllers/public.controller';
import { submissionLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.get('/health', publicController.health);
router.get('/settings/public', publicController.publicSettings);
router.get('/services', publicController.listServices);
router.get('/portfolio', publicController.listPortfolio);
router.get('/portfolio/:id', publicController.getPortfolio);
router.get('/social-links', publicController.socialLinks);
router.get('/feedback/public', publicController.publicFeedback);
router.post('/enquiries', submissionLimiter, publicController.createEnquiry);
router.post('/feedback', submissionLimiter, publicController.createFeedback);

export default router;
