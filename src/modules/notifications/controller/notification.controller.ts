import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../service/notification.service';
import { NotificationListQueryDTO } from '../dto/notification.dto';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const query: NotificationListQueryDTO = req.query as any;
      const result = await notificationService.list(userId, query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await notificationService.markAsRead(userId, id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const count = await notificationService.markAllAsRead(userId);
      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
