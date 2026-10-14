import { notificationRepository } from '../repository/notification.repository';
import { CreateNotificationDTO, NotificationListQueryDTO } from '../dto/notification.dto';
import { NOTIFICATION_ERRORS } from '../constants/notification.constants';
import { NotFoundError } from '../../../utils/errors';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  async create(data: CreateNotificationDTO) {
    return notificationRepository.create({
      user: { connect: { id: data.userId } },
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || {},
    });
  }

  async sendToUser(userId: string, type: NotificationType, title: string, message: string, data?: Record<string, any>) {
    return this.create({
      userId,
      type,
      title,
      message,
      data,
    });
  }

  async list(userId: string, query: NotificationListQueryDTO) {
    return notificationRepository.findByUser(userId, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 20,
      read: query.read,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) throw new NotFoundError(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    // Someone else's notification is reported as "not found", not "forbidden".
    // A 403 would confirm that this notification id exists, letting a caller
    // enumerate valid ids belonging to other users. The message must match the
    // status, otherwise the response contradicts itself.
    if (notification.userId !== userId) {
      throw new NotFoundError(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    }
    return notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string) {
    return notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string) {
    return notificationRepository.getUnreadCount(userId);
  }
}

export const notificationService = new NotificationService();
