/**
 * UserNotification aggregate — pure domain unit tests.
 * No NestJS imports, no Prisma, no I/O.
 */
import { UserNotification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/user-notification.aggregate';
import { UserNotificationReadEvent } from '@ssdev-toolkit/nestjs-correspondence/domain/events/user-notification-read.event';
import { UserNotificationArchivedEvent } from '@ssdev-toolkit/nestjs-correspondence/domain/events/user-notification-archived.event';
import { NotificationPushDeliveredEvent } from '@ssdev-toolkit/nestjs-correspondence/domain/events/notification-push-delivered.event';
import {
  NotificationAlreadyReadError,
  NotificationAlreadyArchivedError,
} from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';

const make = () =>
  UserNotification.create({ notificationId: 'notif-1', userId: 'user-1' });

describe('UserNotification aggregate', () => {
  describe('create()', () => {
    it('creates with notificationId and userId', () => {
      const un = make();
      expect(un.notificationId).toBe('notif-1');
      expect(un.userId).toBe('user-1');
    });

    it('defaults isRead to false', () => {
      expect(make().isRead).toBe(false);
    });

    it('defaults isArchived to false', () => {
      expect(make().isArchived).toBe(false);
    });

    it('defaults isPushSent to false', () => {
      expect(make().isPushSent).toBe(false);
    });

    it('defaults pushDelivered to false', () => {
      expect(make().pushDelivered).toBe(false);
    });

    it('generates a UUID id', () => {
      const un = make();
      expect(un.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('markAsRead()', () => {
    it('sets isRead to true', () => {
      const un = make();
      un.markAsRead();
      expect(un.isRead).toBe(true);
    });

    it('sets readAt to a date', () => {
      const un = make();
      const before = new Date();
      un.markAsRead();
      expect(un.readAt).toBeInstanceOf(Date);
      expect(un.readAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('emits UserNotificationReadEvent', () => {
      const un = make();
      un.markAsRead();
      expect(un.domainEvents).toHaveLength(1);
      expect(un.domainEvents[0]).toBeInstanceOf(UserNotificationReadEvent);
    });

    it('UserNotificationReadEvent carries the aggregate', () => {
      const un = make();
      un.markAsRead();
      const event = un.domainEvents[0] as UserNotificationReadEvent;
      expect(event.snapshot.id).toBe(un.id);
    });

    it('throws NotificationAlreadyReadError when already read', () => {
      const un = make();
      un.markAsRead();
      expect(() => un.markAsRead()).toThrow(NotificationAlreadyReadError);
    });

    it('NotificationAlreadyReadError carries the notification id', () => {
      const un = make();
      un.markAsRead();
      try {
        un.markAsRead();
        fail('expected error');
      } catch (e: any) {
        expect(e.message).toContain(un.id);
      }
    });
  });

  describe('archive()', () => {
    it('sets isArchived to true', () => {
      const un = make();
      un.archive();
      expect(un.isArchived).toBe(true);
    });

    it('sets archivedAt to a date', () => {
      const un = make();
      const before = new Date();
      un.archive();
      expect(un.archivedAt).toBeInstanceOf(Date);
      expect(un.archivedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('emits UserNotificationArchivedEvent', () => {
      const un = make();
      un.archive();
      expect(un.domainEvents).toHaveLength(1);
      expect(un.domainEvents[0]).toBeInstanceOf(UserNotificationArchivedEvent);
    });

    it('throws NotificationAlreadyArchivedError on duplicate archive', () => {
      const un = make();
      un.archive();
      expect(() => un.archive()).toThrow(NotificationAlreadyArchivedError);
    });
  });

  describe('markPushDelivered()', () => {
    it('sets isPushSent and pushDelivered to true on success', () => {
      const un = make();
      un.markPushDelivered(true);
      expect(un.isPushSent).toBe(true);
      expect(un.pushDelivered).toBe(true);
    });

    it('sets pushSentAt to a date', () => {
      const un = make();
      const before = new Date();
      un.markPushDelivered(true);
      expect(un.pushSentAt).toBeInstanceOf(Date);
      expect(un.pushSentAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('sets pushDelivered=false and pushError when failed', () => {
      const un = make();
      un.markPushDelivered(false, 'timeout error');
      expect(un.pushDelivered).toBe(false);
      expect(un.isPushSent).toBe(true);
      expect(un.pushError).toBe('timeout error');
    });

    it('emits NotificationPushDeliveredEvent', () => {
      const un = make();
      un.markPushDelivered(true);
      expect(un.domainEvents).toHaveLength(1);
      expect(un.domainEvents[0]).toBeInstanceOf(NotificationPushDeliveredEvent);
    });

    it('NotificationPushDeliveredEvent carries the aggregate', () => {
      const un = make();
      un.markPushDelivered(true);
      const event = un.domainEvents[0] as NotificationPushDeliveredEvent;
      expect(event.snapshot.id).toBe(un.id);
    });
  });
});
