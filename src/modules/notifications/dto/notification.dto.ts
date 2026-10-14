import { NotificationType } from '@prisma/client';

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationListQueryDTO {
  page?: number;
  limit?: number;
  read?: boolean;
}
