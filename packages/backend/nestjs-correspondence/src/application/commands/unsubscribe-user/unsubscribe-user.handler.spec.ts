/**
 * UnsubscribeUserHandler unit tests.
 */
import { UnsubscribeUserHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/unsubscribe-user/unsubscribe-user.handler';
import { UnsubscribeUserCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/unsubscribe-user/unsubscribe-user.command';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

function makeActiveSub() {
  return ResourceSubscription.createUserSubscription({
    userId: 'user-1',
    userEmail: 'u1@test.com',
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
  });
}

function buildHandler(findResult: ResourceSubscription | null = makeActiveSub()) {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    findByUserAndResource: jest.fn().mockResolvedValue(findResult),
    update: jest.fn().mockResolvedValue(undefined),
    findByRoleAndResource: jest.fn(),
    findActiveSubscribersForResource: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateEmailForUser: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const eventBus = { publishAll: jest.fn() };
  const handler = new UnsubscribeUserHandler(repo, eventBus as any);
  return { handler, repo };
}

describe('UnsubscribeUserHandler', () => {
  it('deactivates the subscription and saves it', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new UnsubscribeUserCommand('user-1', 'project', 'proj-1');
    await handler.execute(cmd);
    const [, saved] = (repo.update as jest.Mock).mock.calls[0];
    expect(saved.isActive).toBe(false);
  });

  it('throws SubscriptionNotFoundError when subscription not found', async () => {
    const { handler } = buildHandler(null);
    const cmd = new UnsubscribeUserCommand('user-1', 'project');
    await expect(handler.execute(cmd)).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('calls findByUserAndResource with correct args', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new UnsubscribeUserCommand('user-1', 'project', 'proj-123');
    await handler.execute(cmd);
    expect(repo.findByUserAndResource).toHaveBeenCalledWith('user-1', 'project', 'proj-123');
  });

  it('calls update with the deactivated subscription', async () => {
    const sub = makeActiveSub();
    const { handler, repo } = buildHandler(sub);
    const cmd = new UnsubscribeUserCommand('user-1', 'project');
    await handler.execute(cmd);
    expect(repo.update).toHaveBeenCalledWith(sub.id, expect.objectContaining({ isActive: false }));
  });
});
