import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { UserNotification } from '../aggregates/user-notification.aggregate';

export type NotificationPushDeliveredSnapshot = Pick<UserNotification, 'id' | 'notificationId' | 'userId' | 'pushDelivered'>;

export class NotificationPushDeliveredEvent extends DomainEvent<NotificationPushDeliveredSnapshot> {
  constructor(snapshot: NotificationPushDeliveredSnapshot) {
    super(snapshot.id, snapshot);
  }
}
