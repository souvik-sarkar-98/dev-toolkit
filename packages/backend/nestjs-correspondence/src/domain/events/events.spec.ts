/**
 * Domain events — payload correctness tests.
 * Pure unit tests, no framework imports.
 */
import { Notification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/notification.aggregate';
import { UserNotification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/user-notification.aggregate';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { NotificationCreatedEvent, type NotificationCreatedSnapshot } from '@ssdev-toolkit/nestjs-correspondence/domain/events/notification-created.event';
import { UserNotificationReadEvent, type UserNotificationReadSnapshot } from '@ssdev-toolkit/nestjs-correspondence/domain/events/user-notification-read.event';
import { UserNotificationArchivedEvent, type UserNotificationArchivedSnapshot } from '@ssdev-toolkit/nestjs-correspondence/domain/events/user-notification-archived.event';
import { NotificationPushDeliveredEvent, type NotificationPushDeliveredSnapshot } from '@ssdev-toolkit/nestjs-correspondence/domain/events/notification-push-delivered.event';
import { SubscriptionDeactivatedEvent, type SubscriptionDeactivatedSnapshot } from '@ssdev-toolkit/nestjs-correspondence/domain/events/subscription-deactivated.event';
import { NotificationType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/notification-type.enum';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

describe('Domain events', () => {
  describe('NotificationCreatedEvent', () => {
    it('carries the notification snapshot as payload', () => {
      const notification = Notification.create({
        title: 'Hello',
        body: 'World',
        type: NotificationType.INFO,
        category: 'SYSTEM',
      });
      const event = new NotificationCreatedEvent(notification.toSnapshot<NotificationCreatedSnapshot>());
      expect(event.snapshot.id).toBe(notification.id);
    });

    it('aggregateId matches notification.id', () => {
      const notification = Notification.create({
        title: 'Hello',
        body: 'World',
        type: NotificationType.INFO,
        category: 'SYSTEM',
      });
      const event = new NotificationCreatedEvent(notification.toSnapshot<NotificationCreatedSnapshot>());
      expect(event.aggregateId).toBe(notification.id);
    });
  });

  describe('UserNotificationReadEvent', () => {
    it('carries the userNotification snapshot as payload', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new UserNotificationReadEvent(un.toSnapshot<UserNotificationReadSnapshot>());
      expect(event.snapshot.id).toBe(un.id);
    });

    it('aggregateId matches userNotification.id', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new UserNotificationReadEvent(un.toSnapshot<UserNotificationReadSnapshot>());
      expect(event.aggregateId).toBe(un.id);
    });
  });

  describe('UserNotificationArchivedEvent', () => {
    it('carries the userNotification snapshot as payload', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new UserNotificationArchivedEvent(un.toSnapshot<UserNotificationArchivedSnapshot>());
      expect(event.snapshot.id).toBe(un.id);
    });

    it('aggregateId matches userNotification.id', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new UserNotificationArchivedEvent(un.toSnapshot<UserNotificationArchivedSnapshot>());
      expect(event.aggregateId).toBe(un.id);
    });
  });

  describe('NotificationPushDeliveredEvent', () => {
    it('carries the userNotification snapshot as payload', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new NotificationPushDeliveredEvent(un.toSnapshot<NotificationPushDeliveredSnapshot>());
      expect(event.snapshot.id).toBe(un.id);
    });

    it('aggregateId matches userNotification.id', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      const event = new NotificationPushDeliveredEvent(un.toSnapshot<NotificationPushDeliveredSnapshot>());
      expect(event.aggregateId).toBe(un.id);
    });
  });

  describe('SubscriptionDeactivatedEvent', () => {
    it('carries the subscription snapshot as payload', () => {
      const sub = ResourceSubscription.createUserSubscription({
        userId: 'u-1',
        userEmail: 'u1@test.com',
        resourceType: 'project',
        via: SubscribedVia.MANUAL,
      });
      const event = new SubscriptionDeactivatedEvent(sub.toSnapshot<SubscriptionDeactivatedSnapshot>());
      expect(event.snapshot.id).toBe(sub.id);
    });

    it('aggregateId matches subscription.id', () => {
      const sub = ResourceSubscription.createUserSubscription({
        userId: 'u-1',
        userEmail: 'u1@test.com',
        resourceType: 'project',
        via: SubscribedVia.MANUAL,
      });
      const event = new SubscriptionDeactivatedEvent(sub.toSnapshot<SubscriptionDeactivatedSnapshot>());
      expect(event.aggregateId).toBe(sub.id);
    });
  });

  describe('Events emitted by aggregates', () => {
    it('Notification.create() registers NotificationCreatedEvent on domainEvents', () => {
      const n = Notification.create({
        title: 'T',
        body: 'B',
        type: NotificationType.TASK,
        category: 'WORKFLOW',
      });
      expect(n.domainEvents[0]).toBeInstanceOf(NotificationCreatedEvent);
    });

    it('UserNotification.markAsRead() registers UserNotificationReadEvent on domainEvents', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      un.markAsRead();
      expect(un.domainEvents[0]).toBeInstanceOf(UserNotificationReadEvent);
    });

    it('UserNotification.archive() registers UserNotificationArchivedEvent on domainEvents', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      un.archive();
      expect(un.domainEvents[0]).toBeInstanceOf(UserNotificationArchivedEvent);
    });

    it('UserNotification.markPushDelivered() registers NotificationPushDeliveredEvent on domainEvents', () => {
      const un = UserNotification.create({ notificationId: 'n-1', userId: 'u-1' });
      un.markPushDelivered(true);
      expect(un.domainEvents[0]).toBeInstanceOf(NotificationPushDeliveredEvent);
    });

    it('ResourceSubscription.deactivate() registers SubscriptionDeactivatedEvent on domainEvents', () => {
      const sub = ResourceSubscription.createUserSubscription({
        userId: 'u-1',
        userEmail: 'u1@test.com',
        resourceType: 'project',
        via: SubscribedVia.MANUAL,
      });
      sub.deactivate();
      expect(sub.domainEvents[0]).toBeInstanceOf(SubscriptionDeactivatedEvent);
    });
  });
});
