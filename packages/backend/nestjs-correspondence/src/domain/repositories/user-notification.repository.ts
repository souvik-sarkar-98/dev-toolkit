import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { UserNotification, UserNotificationFilter } from '../aggregates/user-notification.aggregate';

export interface IUserNotificationRepository
  extends IRepository<UserNotification, string, UserNotificationFilter> {
  findByUserAndNotification(
    userId: string,
    notificationId: string,
  ): Promise<UserNotification | null>;

  countUnread(userId: string): Promise<number>;

  markAllReadForUser(userId: string): Promise<void>;
}

export const IUserNotificationRepository = Symbol('IUserNotificationRepository');
