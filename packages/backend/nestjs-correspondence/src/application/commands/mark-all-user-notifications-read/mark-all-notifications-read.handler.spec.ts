/**
 * MarkAllUserNotificationsReadHandler unit tests.
 */
import { MarkAllUserNotificationsReadHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/mark-all-user-notifications-read/mark-all-user-notifications-read.handler';
import { MarkAllUserNotificationsReadCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/mark-all-user-notifications-read/mark-all-user-notifications-read.command';
import { IUserNotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/user-notification.repository';
import { EventBus, IEvent } from '@nestjs/cqrs';

function buildHandler() {
  const repo: jest.Mocked<IUserNotificationRepository> = {
    markAllReadForUser: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByUserAndNotification: jest.fn(),
    countUnread: jest.fn(),
  };

  const eventBus = { publishAll: jest.fn() } as Pick<EventBus<IEvent>, 'publishAll'>;

  const handler = new MarkAllUserNotificationsReadHandler(
    repo,
    eventBus as EventBus<IEvent>,
  );
  return { handler, repo, eventBus };
}

describe('MarkAllUserNotificationsReadHandler', () => {
  it('calls markAllReadForUser with the userId', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new MarkAllUserNotificationsReadCommand('user-1');
    await handler.execute(cmd);
    expect(repo.markAllReadForUser).toHaveBeenCalledWith('user-1');
  });

  it('calls markAllReadForUser exactly once', async () => {
    const { handler, repo } = buildHandler();
    await handler.execute(new MarkAllUserNotificationsReadCommand('user-1'));
    expect(repo.markAllReadForUser).toHaveBeenCalledTimes(1);
  });

  it('resolves without error', async () => {
    const { handler } = buildHandler();
    await expect(
      handler.execute(new MarkAllUserNotificationsReadCommand('user-1')),
    ).resolves.toBeUndefined();
  });
});
