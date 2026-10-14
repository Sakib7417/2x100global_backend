import { Router } from 'express';
import { notificationController } from '../controller/notification.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, notificationController.list.bind(notificationController));
router.get('/unread-count', authenticate, notificationController.getUnreadCount.bind(notificationController));
router.put('/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.put('/read-all', authenticate, notificationController.markAllAsRead.bind(notificationController));

export default router;
