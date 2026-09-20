/**
 * ArchiveUserNotificationHandler unit tests.
 */
import { ArchiveUserNotificationHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/archive-user-notification/archive-user-notification.handler';
import { ArchiveUserNotificationCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/archive-user-notification/archive-user-notification.command';
import { IUserNotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/user-notification.repository';
import { UserNotificationNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';
import { UserNotification } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/user-notification.aggregate';

function makeUN(userId = 'user-1') {
  return UserNotification.create({ notificationId: 'notif-1', userId });
}

function buildHandler(findResult: any = makeUN()) {
  const repo: jest.Mocked<IUserNotificationRepository> = {
    findById: jest.fn().mockResolvedValue(findResult),
    update: jest.fn().mockResolvedValue(undefined),
    findByUserAndNotification: jest.fn(),
    countUnread: jest.fn(),
    markAllReadForUser: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  } as any;

  const eventBus = { publishAll: jest.fn() };
  const handler = new ArchiveUserNotificationHandler(repo, eventBus as any);
  return { handler, repo };
}

describe('ArchiveUserNotificationHandler', () => {
  it('archives the notification and saves', async () => {
    const un = makeUN();
    const { handler, repo } = buildHandler(un);
    const cmd = new ArchiveUserNotificationCommand(un.id, 'user-1');
    await handler.execute(cmd);
    const [, saved] = (repo.update as jest.Mock).mock.calls[0];
    expect(saved.isArchived).toBe(true);
    expect(saved.archivedAt).toBeDefined();
  });

  it('throws UserNotificationNotFoundError when notification not found', async () => {
    const { handler } = buildHandler(null);
    const cmd = new ArchiveUserNotificationCommand('un-x', 'user-1');
    await expect(handler.execute(cmd)).rejects.toThrow(UserNotificationNotFoundError);
  });

  it('throws UserNotificationNotFoundError when requestingUserId does not match', async () => {
    const un = makeUN('user-1');
    const { handler } = buildHandler(un);
    const cmd = new ArchiveUserNotificationCommand(un.id, 'other-user');
    await expect(handler.execute(cmd)).rejects.toThrow(UserNotificationNotFoundError);
  });

  it('calls update exactly once', async () => {
    const un = makeUN();
    const { handler, repo } = buildHandler(un);
    await handler.execute(new ArchiveUserNotificationCommand(un.id, 'user-1'));
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
