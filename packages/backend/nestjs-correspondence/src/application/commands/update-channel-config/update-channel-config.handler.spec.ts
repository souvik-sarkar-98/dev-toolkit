/**
 * UpdateChannelConfigHandler unit tests.
 */
import { UpdateChannelConfigHandler } from '@ssdev-toolkit/nestjs-correspondence/application/commands/update-channel-config/update-channel-config.handler';
import { UpdateChannelConfigCommand } from '@ssdev-toolkit/nestjs-correspondence/application/commands/update-channel-config/update-channel-config.command';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '@ssdev-toolkit/nestjs-correspondence/domain/errors/correspondence.errors';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

function makeUserSub(userId = 'user-1') {
  return ResourceSubscription.createUserSubscription({
    userId,
    userEmail: 'u1@test.com',
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
  });
}

function buildHandler(findResult: any = makeUserSub()) {
  const repo: jest.Mocked<IResourceSubscriptionRepository> = {
    findById: jest.fn().mockResolvedValue(findResult),
    update: jest.fn().mockResolvedValue(undefined),
    findByUserAndResource: jest.fn(),
    findByRoleAndResource: jest.fn(),
    findActiveSubscribersForResource: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateEmailForUser: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const handler = new UpdateChannelConfigHandler(repo);
  return { handler, repo };
}

describe('UpdateChannelConfigHandler', () => {
  it('updates channel config and saves the subscription', async () => {
    const sub = makeUserSub();
    const { handler, repo } = buildHandler(sub);
    const cmd = new UpdateChannelConfigCommand('sub-1', 'user-1', ChannelType.EMAIL, false, EmailRole.CC);
    await handler.execute(cmd);
    expect(repo.update).toHaveBeenCalledWith(sub.id, expect.anything());
  });

  it('throws SubscriptionNotFoundError when subscription not found', async () => {
    const { handler } = buildHandler(null);
    const cmd = new UpdateChannelConfigCommand('sub-x', 'user-1', ChannelType.EMAIL, true);
    await expect(handler.execute(cmd)).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('throws SubscriptionNotFoundError when requestingUserId does not match', async () => {
    const sub = makeUserSub('user-1');
    const { handler } = buildHandler(sub);
    const cmd = new UpdateChannelConfigCommand('sub-1', 'other-user', ChannelType.EMAIL, true);
    await expect(handler.execute(cmd)).rejects.toThrow(SubscriptionNotFoundError);
  });

  it('adds the channel to the subscription channels', async () => {
    const sub = makeUserSub();
    const { handler, repo } = buildHandler(sub);
    const cmd = new UpdateChannelConfigCommand('sub-1', 'user-1', ChannelType.EMAIL, true, EmailRole.TO);
    await handler.execute(cmd);
    const [, updated] = (repo.update as jest.Mock).mock.calls[0];
    const emailCh = updated.channels.find((c: any) => c.channel === ChannelType.EMAIL);
    expect(emailCh).toBeDefined();
    expect(emailCh.enabled).toBe(true);
  });
});
