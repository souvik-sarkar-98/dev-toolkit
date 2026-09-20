/**
 * GetUnreadCountHandler unit tests.
 */
import { GetUnreadCountHandler } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-unread-count/get-unread-count.handler';
import { GetUnreadCountQuery } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-unread-count/get-unread-count.query';
import { IUserNotificationRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/user-notification.repository';

function buildHandler(count = 0) {
  const repo: jest.Mocked<IUserNotificationRepository> = {
    countUnread: jest.fn().mockResolvedValue(count),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByUserAndNotification: jest.fn(),
    markAllReadForUser: jest.fn(),
  } as any;

  const handler = new GetUnreadCountHandler(repo);
  return { handler, repo };
}

describe('GetUnreadCountHandler', () => {
  it('returns the unread count for the user', async () => {
    const { handler } = buildHandler(5);
    const result = await handler.execute(new GetUnreadCountQuery('user-1'));
    expect(result).toBe(5);
  });

  it('returns 0 when no unread notifications', async () => {
    const { handler } = buildHandler(0);
    const result = await handler.execute(new GetUnreadCountQuery('user-1'));
    expect(result).toBe(0);
  });

  it('calls countUnread with the correct userId', async () => {
    const { handler, repo } = buildHandler(3);
    await handler.execute(new GetUnreadCountQuery('user-abc'));
    expect(repo.countUnread).toHaveBeenCalledWith('user-abc');
  });

  it('calls countUnread exactly once', async () => {
    const { handler, repo } = buildHandler(1);
    await handler.execute(new GetUnreadCountQuery('user-1'));
    expect(repo.countUnread).toHaveBeenCalledTimes(1);
  });
});
