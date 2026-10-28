import { Router } from 'express';
import { adminController as c } from '../controllers/admin.controller';
import { mediaController as m } from '../controllers/media.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { singleFileUpload } from '../middleware/upload.middleware';

const router = Router();

// Every admin route requires a valid session.
router.use(requireAuth);

const anyAdmin = requireRole('admin', 'editor');
const fullAdmin = requireRole('admin');

router.get('/dashboard', anyAdmin, c.dashboard);

// Private customer data and configuration: full admins only.
router.get('/enquiries', fullAdmin, c.listEnquiries);
router.get('/enquiries/:id', fullAdmin, c.getEnquiry);
router.patch('/enquiries/:id/status', fullAdmin, c.updateEnquiryStatus);
router.post('/notifications/:id/retry', fullAdmin, c.retryNotification);
router.get('/settings', fullAdmin, c.getSettings);
router.put('/settings', fullAdmin, c.updateSettings);
router.get('/integrations', fullAdmin, c.integrations);
router.post('/integrations/email/verify', fullAdmin, c.verifyEmail);
router.get('/audit-logs', fullAdmin, c.auditLogs);

// Website content: admins and editors.
router.get('/feedback', anyAdmin, c.listFeedback);
router.patch('/feedback/:id/moderation', anyAdmin, c.moderateFeedback);

router.get('/portfolio', anyAdmin, c.listPortfolio);
router.post('/portfolio', anyAdmin, c.createPortfolio);
router.put('/portfolio/:id', anyAdmin, c.updatePortfolio);
router.delete('/portfolio/:id', anyAdmin, c.deletePortfolio);

router.get('/services', anyAdmin, c.listServices);
router.post('/services', anyAdmin, c.createService);
router.put('/services/:id', anyAdmin, c.updateService);
router.delete('/services/:id', anyAdmin, c.deleteService);

router.get('/social-links', anyAdmin, c.listSocialLinks);
router.put('/social-links/:id', anyAdmin, c.updateSocialLink);
router.post('/social-links/sync', anyAdmin, c.syncSocialCounts);

// Photo / video uploads (media library).
router.post('/uploads', anyAdmin, singleFileUpload, m.upload);
router.get('/media', anyAdmin, m.list);
router.get('/media/:id/usages', anyAdmin, m.usages);
router.delete('/media/:id', anyAdmin, m.remove);

export default router;
