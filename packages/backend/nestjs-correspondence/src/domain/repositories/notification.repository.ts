import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Notification, NotificationFilter } from '../aggregates/notification.aggregate';
import { UserNotification } from '../aggregates/user-notification.aggregate';

export interface INotificationRepository
  extends IRepository<Notification, string, NotificationFilter> {
  /**
   * Atomically creates a Notification and its associated UserNotifications
   * in a single transaction. Returns the created Notification.
   */
  createWithUserNotifications(
    notification: Notification,
    userNotifications: UserNotification[],
  ): Promise<Notification>;

  /** Bulk-update push status for a list of UserNotification IDs */
  bulkMarkPushSent(
    userNotificationIds: string[],
    success: boolean,
    error?: string,
  ): Promise<void>;

  /** Delete notifications older than the given date */
  deleteExpiredBefore(date: Date): Promise<number>;

  /**
   * Aggregate delivery outcome per notification, derived from recipient push
   * results. "failed" takes precedence when any recipient push was attempted
   * but not delivered; otherwise "succeeded" when at least one was delivered.
   * Notifications with no attempted push are omitted from the map.
   */
  getDeliveryStatuses(
    notificationIds: string[],
  ): Promise<Map<string, 'failed' | 'succeeded'>>;
}

export const INotificationRepository = Symbol('INotificationRepository');
