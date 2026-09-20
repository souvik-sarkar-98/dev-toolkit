/**
 * GetUserSubscriptionsHandler unit tests.
 */
import { GetUserSubscriptionsHandler } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-user-subscriptions/get-user-subscriptions.handler';
import { GetUserSubscriptionsQuery } from '@ssdev-toolkit/nestjs-correspondence/application/queries/get-user-subscriptions/get-user-subscriptions.query';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

function makeSub(userId: string) {
  return ResourceSubscription.createUserSubscription({
    userId,
    userEmail: `${userId}@test.com`,
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
  });
}

function buildHandler(subs: ResourceSubscription[] = []) {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    findAll: jest.fn().mockResolvedValue(subs),
    findById: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findByUserAndResource: jest.fn(),
    findByRoleAndResource: jest.fn(),
    findActiveSubscribersForResource: jest.fn(),
    updateEmailForUser: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const handler = new GetUserSubscriptionsHandler(repo);
  return { handler, repo };
}

describe('GetUserSubscriptionsHandler', () => {
  it('calls findAll with userId and isActive=true', async () => {
    const { handler, repo } = buildHandler([]);
    await handler.execute(new GetUserSubscriptionsQuery('user-1'));
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', isActive: true }),
    );
  });

  it('passes resourceType filter when provided', async () => {
    const { handler, repo } = buildHandler([]);
    await handler.execute(new GetUserSubscriptionsQuery('user-1', 'project'));
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'project' }),
    );
  });

  it('passes resourceId filter when provided', async () => {
    const { handler, repo } = buildHandler([]);
    await handler.execute(new GetUserSubscriptionsQuery('user-1', 'project', 'proj-1'));
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'proj-1' }),
    );
  });

  it('returns mapped DTOs for each subscription', async () => {
    const subs = [makeSub('user-1'), makeSub('user-1')];
    const { handler } = buildHandler(subs);
    const result = await handler.execute(new GetUserSubscriptionsQuery('user-1'));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no subscriptions found', async () => {
    const { handler } = buildHandler([]);
    const result = await handler.execute(new GetUserSubscriptionsQuery('user-1'));
    expect(result).toHaveLength(0);
  });
});
