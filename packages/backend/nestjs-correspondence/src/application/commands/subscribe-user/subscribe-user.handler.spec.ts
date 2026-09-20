/**
 * SubscribeUserHandler unit tests.
 */
import { SubscribeUserHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/subscribe-user/subscribe-user.handler';
import { SubscribeUserCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/subscribe-user/subscribe-user.command';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';
import type { CorrespondenceModuleOptions } from '../../../correspondence.schema';

function makeActiveUserSub() {
  return ResourceSubscription.createUserSubscription({
    userId: 'user-1',
    userEmail: 'user1@test.com',
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
  });
}

function buildHandler(
  findByUserResult: ResourceSubscription | null = null,
  options: Partial<CorrespondenceModuleOptions> = {},
) {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    findByUserAndResource: jest.fn().mockResolvedValue(findByUserResult),
    create: jest.fn().mockResolvedValue(undefined),
    findByRoleAndResource: jest.fn(),
    findActiveSubscribersForResource: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateEmailForUser: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const eventBus = { publishAll: jest.fn() };
  const handler = new SubscribeUserHandler(
    repo,
    eventBus as any,
    { environment: 'test', ...options },
  );
  return { handler, repo };
}

describe('SubscribeUserHandler', () => {
  it('creates a new user subscription when none exists', async () => {
    const { handler, repo } = buildHandler(null);
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'project',
      SubscribedVia.MANUAL,
    );
    await handler.execute(cmd);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('passes correct userId and resourceType to the repository', async () => {
    const { handler, repo } = buildHandler(null);
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'project',
      SubscribedVia.MANUAL,
      undefined,
      'proj-123',
    );
    await handler.execute(cmd);
    const [sub] = (repo.create as jest.Mock).mock.calls[0];
    expect(sub.userId).toBe('user-1');
    expect(sub.resourceType).toBe('project');
  });

  it('is idempotent — skips create when subscription already exists', async () => {
    const existing = makeActiveUserSub();
    const { handler, repo } = buildHandler(existing);
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'project',
      SubscribedVia.MANUAL,
    );
    await handler.execute(cmd);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates subscription with provided channels', async () => {
    const { handler, repo } = buildHandler(null);
    const channels = [
      { channel: ChannelType.EMAIL, enabled: true, emailRole: EmailRole.TO },
      { channel: ChannelType.PUSH, enabled: true },
    ];
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'project',
      SubscribedVia.MANUAL,
      undefined,
      undefined,
      channels,
    );
    await handler.execute(cmd);
    const [sub] = (repo.create as jest.Mock).mock.calls[0];
    expect(sub.channels).toHaveLength(2);
  });

  it('checks existing subscription against userId and resourceType', async () => {
    const { handler, repo } = buildHandler(null);
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'project',
      SubscribedVia.MANUAL,
      undefined,
      'proj-123',
    );
    await handler.execute(cmd);
    expect(repo.findByUserAndResource).toHaveBeenCalledWith('user-1', 'project', 'proj-123');
  });

  it('rejects resource types not in the allowlist', async () => {
    const { handler, repo } = buildHandler(null, {
      allowedResourceTypes: [{ resourceType: 'project' }, { resourceType: 'request' }],
    });
    const cmd = new SubscribeUserCommand(
      'user-1',
      'user1@test.com',
      'donation',
      SubscribedVia.MANUAL,
    );
    await expect(handler.execute(cmd)).rejects.toThrow(
      /entityType "donation" is not registered with the correspondence module/,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });
});
