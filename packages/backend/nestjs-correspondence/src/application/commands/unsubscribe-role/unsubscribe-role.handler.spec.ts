/**
 * UnsubscribeRoleHandler unit tests.
 */
import { UnsubscribeRoleHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/unsubscribe-role/unsubscribe-role.handler';
import { UnsubscribeRoleCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/unsubscribe-role/unsubscribe-role.command';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

function makeActiveSub() {
  return ResourceSubscription.createRoleSubscription({
    roleName: 'MANAGER',
    resourceType: 'project',
    via: SubscribedVia.ROLE_DEFAULT,
  });
}

function buildHandler(findResult: ResourceSubscription | null = makeActiveSub()) {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    findByRoleAndResource: jest.fn().mockResolvedValue(findResult),
    update: jest.fn().mockResolvedValue(undefined),
    findByUserAndResource: jest.fn(),
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
  const handler = new UnsubscribeRoleHandler(repo, eventBus as any);
  return { handler, repo };
}

describe('UnsubscribeRoleHandler', () => {
  it('deactivates the role subscription and saves it', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new UnsubscribeRoleCommand('MANAGER', 'project', 'proj-1');
    await handler.execute(cmd);
    const [, saved] = (repo.update as jest.Mock).mock.calls[0];
    expect(saved.isActive).toBe(false);
  });

  it('throws SubscriptionNotFoundError when role subscription not found', async () => {
    const { handler } = buildHandler(null);
    const cmd = new UnsubscribeRoleCommand('MANAGER', 'project');
    await expect(handler.execute(cmd)).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('calls findByRoleAndResource with correct args', async () => {
    const { handler, repo } = buildHandler();
    const cmd = new UnsubscribeRoleCommand('MANAGER', 'project', 'proj-1');
    await handler.execute(cmd);
    expect(repo.findByRoleAndResource).toHaveBeenCalledWith('MANAGER', 'project', 'proj-1');
  });

  it('calls update with the deactivated subscription id', async () => {
    const sub = makeActiveSub();
    const { handler, repo } = buildHandler(sub);
    const cmd = new UnsubscribeRoleCommand('MANAGER', 'project');
    await handler.execute(cmd);
    expect(repo.update).toHaveBeenCalledWith(sub.id, expect.objectContaining({ isActive: false }));
  });
});
