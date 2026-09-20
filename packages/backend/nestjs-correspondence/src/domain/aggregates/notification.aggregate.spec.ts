/**
 * Notification aggregate — pure domain unit tests.
 * No NestJS imports, no Prisma, no I/O.
 */
import { Notification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/notification.aggregate';
import { NotificationType, NotificationPriority } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/notification-type.enum';
import { NotificationCreatedEvent } from '@ssdev-toolkit/nestjs-correspondence/domain/events/notification-created.event';

const baseCreate = () =>
  Notification.create({
    title: 'Test Title',
    body: 'Test body',
    type: NotificationType.INFO,
    category: 'SYSTEM',
  });

describe('Notification aggregate', () => {
  describe('create()', () => {
    it('generates a UUID id', () => {
      const n = baseCreate();
      expect(n.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('sets title and body', () => {
      const n = baseCreate();
      expect(n.title).toBe('Test Title');
      expect(n.body).toBe('Test body');
    });

    it('sets type and category', () => {
      const n = baseCreate();
      expect(n.type).toBe(NotificationType.INFO);
      expect(n.category).toBe('SYSTEM');
    });

    it('defaults priority to NORMAL when not provided', () => {
      const n = baseCreate();
      expect(n.priority).toBe(NotificationPriority.NORMAL);
    });

    it('sets explicit priority when provided', () => {
      const n = Notification.create({
        title: 'Urgent',
        body: 'body',
        type: NotificationType.ERROR,
        category: 'SYSTEM',
        priority: NotificationPriority.URGENT,
      });
      expect(n.priority).toBe(NotificationPriority.URGENT);
    });

    it('sets optional fields: referenceId, referenceType, dispatchId', () => {
      const n = Notification.create({
        title: 'T',
        body: 'B',
        type: NotificationType.TASK,
        category: 'WORKFLOW',
        referenceId: 'ref-123',
        referenceType: 'task',
        dispatchId: 'dispatch-456',
      });
      expect(n.referenceId).toBe('ref-123');
      expect(n.referenceType).toBe('task');
      expect(n.dispatchId).toBe('dispatch-456');
    });

    it('sets action, imageUrl, icon, metadata when provided', () => {
      const action = { url: 'https://example.com', type: 'deep-link' };
      const metadata = { key: 'value' };
      const n = Notification.create({
        title: 'T',
        body: 'B',
        type: NotificationType.INFO,
        category: 'SYSTEM',
        action,
        imageUrl: 'https://img.example.com/img.png',
        icon: 'icon-name',
        metadata,
      });
      expect(n.action).toEqual(action);
      expect(n.imageUrl).toBe('https://img.example.com/img.png');
      expect(n.icon).toBe('icon-name');
      expect(n.metadata).toEqual(metadata);
    });

    it('adds a NotificationCreatedEvent to domainEvents', () => {
      const n = baseCreate();
      expect(n.domainEvents).toHaveLength(1);
      expect(n.domainEvents[0]).toBeInstanceOf(NotificationCreatedEvent);
    });

    it('NotificationCreatedEvent carries the notification as payload', () => {
      const n = baseCreate();
      const event = n.domainEvents[0] as NotificationCreatedEvent;
      expect(event.snapshot.id).toBe(n.id);
    });

    it('each call produces a different id', () => {
      const a = baseCreate();
      const b = baseCreate();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('isExpired()', () => {
    it('returns false when expiresAt is not set', () => {
      const n = baseCreate();
      expect(n.isExpired()).toBe(false);
    });

    it('returns false when expiresAt is in the future', () => {
      const future = new Date(Date.now() + 60_000);
      const n = Notification.create({
        title: 'T',
        body: 'B',
        type: NotificationType.INFO,
        category: 'SYSTEM',
        expiresAt: future,
      });
      expect(n.isExpired()).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
      const past = new Date(Date.now() - 60_000);
      const n = Notification.create({
        title: 'T',
        body: 'B',
        type: NotificationType.INFO,
        category: 'SYSTEM',
        expiresAt: past,
      });
      expect(n.isExpired()).toBe(true);
    });
  });
});
