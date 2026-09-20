/**
 * GetUserNotificationsHandler unit tests.
 */
import { GetUserNotificationsHandler } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserNotificationsQuery } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-user-notifications/get-user-notifications.query';
import { IUserNotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/user-notification.repository';
import { INotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/notification.repository';
import { UserNotification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/user-notification.aggregate';
import { Notification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/notification.aggregate';
import { NotificationType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/notification-type.enum';
import { UserNotificationFilter } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/user-notification.aggregate';
import { BaseFilter, Page } from '@ssdev-toolkit/nestjs-core';

function query(props: UserNotificationFilter, pageIndex?: number, pageSize?: number) {
  return new GetUserNotificationsQuery(new BaseFilter<UserNotificationFilter>(props, pageIndex, pageSize));
}

function makeNotification(id: string) {
  const n = Notification.create({
    title: `Title ${id}`,
    body: 'Body',
    type: NotificationType.INFO,
    category: 'SYSTEM',
  });
  // Rebuild to have a known id
  return Object.assign(n, { _id: id }) as any;
}

function makeUN(userId: string, notifId: string) {
  return UserNotification.create({ notificationId: notifId, userId });
}

function buildHandler(
  pageContent: UserNotification[] = [],
  notifResult: Notification | null = null,
) {
  const userNotifRepo: jest.Mocked<IUserNotificationRepository> = {
    findPaged: jest.fn().mockResolvedValue(
      new Page(pageContent, pageContent.length, 0, 20),
    ),
    findById: jest.fn(),
    findByUserAndNotification: jest.fn(),
    countUnread: jest.fn(),
    markAllReadForUser: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  } as any;

  const notifRepo: jest.Mocked<INotificationRepository> = {
    findById: jest.fn().mockResolvedValue(notifResult),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    createWithUserNotifications: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    bulkMarkPushSent: jest.fn(),
    deleteExpiredBefore: jest.fn(),
  } as any;

  const handler = new GetUserNotificationsHandler(userNotifRepo, notifRepo);
  return { handler, userNotifRepo, notifRepo };
}

describe('GetUserNotificationsHandler', () => {
  it('calls findPaged with userId filter', async () => {
    const { handler, userNotifRepo } = buildHandler([]);
    await handler.execute(query({ userId: 'user-1' }, 0, 10));
    expect(userNotifRepo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('returns a Page with correct totalSize', async () => {
    const uns = [makeUN('user-1', 'n-1'), makeUN('user-1', 'n-2')];
    const { handler } = buildHandler(uns);
    const result = await handler.execute(query({ userId: 'user-1' }));
    expect(result.totalSize).toBe(2);
  });

  it('passes isRead filter when provided', async () => {
    const { handler, userNotifRepo } = buildHandler([]);
    await handler.execute(query({ userId: 'user-1', isRead: false }, 0, 10));
    expect(userNotifRepo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ isRead: false }) }),
    );
  });

  it('passes isArchived filter when provided', async () => {
    const { handler, userNotifRepo } = buildHandler([]);
    await handler.execute(query({ userId: 'user-1', isArchived: true }, 0, 10));
    expect(userNotifRepo.findPaged).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ isArchived: true }) }),
    );
  });

  it('fetches notification for each user notification', async () => {
    const un1 = makeUN('user-1', 'n-1');
    const un2 = makeUN('user-1', 'n-2');
    const { handler, notifRepo } = buildHandler([un1, un2]);
    await handler.execute(query({ userId: 'user-1' }));
    expect(notifRepo.findById).toHaveBeenCalledTimes(2);
  });

  it('returns DTOs with notificationId', async () => {
    const un = makeUN('user-1', 'n-1');
    const { handler } = buildHandler([un]);
    const result = await handler.execute(query({ userId: 'user-1' }));
    expect(result.content[0]).toHaveProperty('notificationId');
  });
});
