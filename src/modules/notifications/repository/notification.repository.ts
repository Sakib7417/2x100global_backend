import { prisma } from '../../../prisma/client';
import { Notification, Prisma } from '@prisma/client';

export class NotificationRepository {
  async findByUser(userId: string, options: { page: number; limit: number; read?: boolean }) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const read = options.read;
    const where: Prisma.NotificationWhereInput = { userId };
    if (read !== undefined) where.read = read;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }
}

export const notificationRepository = new NotificationRepository();
