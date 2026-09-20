import { Notification } from '../../domain/aggregates/notification.aggregate';
import { UserNotification } from '../../domain/aggregates/user-notification.aggregate';
import { NotificationResponseDto } from '../dtos/notification-response.dto';
import { UserNotificationResponseDto } from '../dtos/user-notification-response.dto';

export class NotificationMapper {
  static toDto(
    notification: Notification,
    status?: 'failed' | 'succeeded',
  ): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.title = notification.title;
    dto.body = notification.body;
    dto.type = notification.type;
    dto.category = notification.category;
    dto.priority = notification.priority;
    dto.action = notification.action;
    dto.referenceId = notification.referenceId;
    dto.referenceType = notification.referenceType;
    dto.imageUrl = notification.imageUrl;
    dto.icon = notification.icon;
    dto.metadata = notification.metadata;
    dto.expiresAt = notification.expiresAt;
    dto.createdAt = notification.createdAt;
    dto.updatedAt = notification.updatedAt;
    dto.status = status;
    return dto;
  }

  static toUserNotificationDto(
    userNotification: UserNotification,
    notification?: Notification,
  ): UserNotificationResponseDto {
    const dto = new UserNotificationResponseDto();
    dto.id = userNotification.id;
    dto.notificationId = userNotification.notificationId;
    dto.userId = userNotification.userId;
    dto.isRead = userNotification.isRead;
    dto.readAt = userNotification.readAt;
    dto.isArchived = userNotification.isArchived;
    dto.archivedAt = userNotification.archivedAt;
    dto.isPushSent = userNotification.isPushSent;
    dto.pushDelivered = userNotification.pushDelivered;
    dto.pushError = userNotification.pushError;
    dto.createdAt = userNotification.createdAt;
    dto.updatedAt = userNotification.updatedAt;
    if (notification) {
      dto.notification = NotificationMapper.toDto(notification);
    }
    return dto;
  }
}
