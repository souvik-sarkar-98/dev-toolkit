import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Notification } from '../aggregates/notification.aggregate';

export type NotificationCreatedSnapshot = Pick<Notification, 'id' | 'title' | 'body' | 'type' | 'category' | 'referenceId' | 'referenceType'>;

export class NotificationCreatedEvent extends DomainEvent<NotificationCreatedSnapshot> {
  constructor(snapshot: NotificationCreatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
