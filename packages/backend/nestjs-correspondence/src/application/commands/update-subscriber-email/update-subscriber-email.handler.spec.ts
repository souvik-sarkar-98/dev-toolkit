/**
 * UpdateSubscriberEmailHandler unit tests.
 */
import { UpdateSubscriberEmailHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/update-subscriber-email/update-subscriber-email.handler';
import { UpdateSubscriberEmailCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/update-subscriber-email/update-subscriber-email.command';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';

function buildHandler() {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    updateEmailForUser: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByUserAndResource: jest.fn(),
    findByRoleAndResource: jest.fn(),
    findActiveSubscribersForResource: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const handler = new UpdateSubscriberEmailHandler(repo);
  return { handler, repo };
}

describe('UpdateSubscriberEmailHandler', () => {
  it('calls updateEmailForUser with userId and newEmail', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new UpdateSubscriberEmailCommand('user-1', 'newemail@test.com');
    await handler.execute(cmd);
    expect(repo.updateEmailForUser).toHaveBeenCalledWith('user-1', 'newemail@test.com');
  });

  it('calls updateEmailForUser exactly once', async () => {
    const { handler, repo } = buildHandler();
    await handler.execute(new UpdateSubscriberEmailCommand('user-1', 'new@test.com'));
    expect(repo.updateEmailForUser).toHaveBeenCalledTimes(1);
  });

  it('resolves without error on success', async () => {
    const { handler } = buildHandler();
    await expect(
      handler.execute(new UpdateSubscriberEmailCommand('user-1', 'new@test.com')),
    ).resolves.toBeUndefined();
  });
});
