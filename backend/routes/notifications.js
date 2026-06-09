import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationTypes,
  sendNotification,
  sendBulkNotifications
} from '../controllers/notificationController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.get('/types', getNotificationTypes);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearAllNotifications);

// Admin only
router.post('/send', requireAdmin, sendNotification);
router.post('/send-bulk', requireAdmin, sendBulkNotifications);

export default router;
