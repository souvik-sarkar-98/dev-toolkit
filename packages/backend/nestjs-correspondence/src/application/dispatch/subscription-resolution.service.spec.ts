/**
 * SubscriptionResolutionService unit tests.
 * Covers: users mode, roles mode, resource mode, and override emails.
 */
import { SubscriptionResolutionService } from '@ssdev-toolkit/nestjs-correspondence/application/dispatch/subscription-resolution.service';
import { IResourceSubscriptionRepository } from '@ssdev-toolkit/nestjs-correspondence/domain/repositories/resource-subscription.repository';
import { IUserLookupPort, UserInfo } from '@ssdev-toolkit/nestjs-core';
import { IUserRolePort } from '@ssdev-toolkit/nestjs-auth';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscriptionChannel } from '@ssdev-toolkit/nestjs-correspondence/domain/entities/subscription-channel.entity';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEmailChannel(emailRole: EmailRole = EmailRole.TO) {
  return SubscriptionChannel.create({
    id: `ch-email-${Math.random()}`,
    subscriptionId: 'sub-1',
    channel: ChannelType.EMAIL,
    enabled: true,
    emailRole,
  });
}

function makeActiveUserSub(userId: string, userEmail: string, channels: SubscriptionChannel[]) {
  return ResourceSubscription.createUserSubscription({
    userId,
    userEmail,
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
    channels,
  });
}

function makeUserInfo(id: string, email: string): UserInfo {
  return { id, email };
}

function buildService(
  subs: ResourceSubscription[] = [],
  usersByIds: UserInfo[] = [],
  idpSubsByRole: string[] = [],
  usersByIdpSubs: UserInfo[] = [],
) {
  const subscriptionRepo: jest.Mocked<IResourceSubscriptionRepository> = {
    findActiveSubscribersForResource: jest.fn().mockResolvedValue(subs),
    findByUserAndResource: jest.fn(),
    findByRoleAndResource: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateEmailForUser: jest.fn(),
    deleteInactiveBefore: jest.fn(),
  } as any;

  const userLookup: jest.Mocked<IUserLookupPort> = {
    findById: jest.fn(),
    findByIds: jest.fn().mockResolvedValue(usersByIds),
    findByIdPSub: jest.fn(),
    findByIdPSubs: jest.fn().mockResolvedValue(usersByIdpSubs),
    findByEmail: jest.fn(),
  };

  const userRole: jest.Mocked<IUserRolePort> = {
    findIdPSubsByRole: jest.fn().mockResolvedValue(idpSubsByRole),
  };

  const svc = new SubscriptionResolutionService(subscriptionRepo, userLookup, userRole);

  return { svc, subscriptionRepo, userLookup, userRole };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SubscriptionResolutionService', () => {
  describe('mode: users', () => {
    it('resolves userIds to targetUserIds and pushUserIds', async () => {
      const { svc } = buildService([], [makeUserInfo('u1', 'u1@test.com')]);
      const result = await svc.resolve({ mode: 'users', userIds: ['u1'] });
      expect(result.targetUserIds).toContain('u1');
      expect(result.pushUserIds).toContain('u1');
    });

    it('maps user emails to emailTo', async () => {
      const { svc } = buildService([], [makeUserInfo('u1', 'u1@test.com')]);
      const result = await svc.resolve({ mode: 'users', userIds: ['u1'] });
      expect(result.emailTo).toContain('u1@test.com');
    });

    it('uses overrideEmails when provided', async () => {
      const { svc } = buildService([], [makeUserInfo('u1', 'u1@test.com')]);
      const result = await svc.resolve(
        { mode: 'users', userIds: ['u1'] },
        ['override@test.com'],
      );
      expect(result.emailTo).toEqual(['override@test.com']);
    });

    it('appends cc when provided', async () => {
      const { svc } = buildService([], [makeUserInfo('u1', 'u1@test.com')]);
      const result = await svc.resolve(
        { mode: 'users', userIds: ['u1'] },
        undefined,
        ['cc@test.com'],
      );
      expect(result.emailCc).toContain('cc@test.com');
    });
  });

  describe('mode: roles', () => {
    it('calls userRole.findIdPSubsByRole then userLookup.findByIdPSubs for each role', async () => {
      const roleUser = makeUserInfo('r1', 'r1@test.com');
      const { svc, userRole, userLookup } = buildService([], [], ['idp|r1'], [roleUser]);

      await svc.resolve({ mode: 'roles', roleNames: ['MANAGER', 'ADMIN'] });

      expect(userRole.findIdPSubsByRole).toHaveBeenCalledWith('MANAGER');
      expect(userRole.findIdPSubsByRole).toHaveBeenCalledWith('ADMIN');
      expect(userLookup.findByIdPSubs).toHaveBeenCalled();
    });

    it('deduplicates users that appear in multiple roles', async () => {
      const sharedUser = makeUserInfo('shared', 'shared@test.com');
      const { svc, userRole, userLookup } = buildService([], [], ['idp|shared'], [sharedUser]);
      userRole.findIdPSubsByRole.mockResolvedValue(['idp|shared']);
      userLookup.findByIdPSubs.mockResolvedValue([sharedUser]);

      const result = await svc.resolve({ mode: 'roles', roleNames: ['A', 'B'] });
      expect(result.targetUserIds.filter((id: string) => id === 'shared')).toHaveLength(1);
    });

    it('resolves to empty when no users in roles', async () => {
      const { svc } = buildService([], [], [], []);
      const result = await svc.resolve({ mode: 'roles', roleNames: ['UNKNOWN'] });
      expect(result.targetUserIds).toHaveLength(0);
    });
  });

  describe('mode: resource', () => {
    it('calls subscriptionRepo.findActiveSubscribersForResource', async () => {
      const { svc, subscriptionRepo } = buildService([]);
      await svc.resolve({ mode: 'resource', referenceType: 'project', referenceId: 'p-1' });
      expect(subscriptionRepo.findActiveSubscribersForResource).toHaveBeenCalledWith(
        'project',
        'p-1',
      );
    });

    it('extracts TO emails from active email subscriptions', async () => {
      const subs = [makeActiveUserSub('u1', 'u1@test.com', [makeEmailChannel(EmailRole.TO)])];
      const { svc } = buildService(subs);
      const result = await svc.resolve({ mode: 'resource', referenceType: 'project' });
      expect(result.emailTo).toContain('u1@test.com');
    });

    it('extracts CC emails from active CC subscriptions', async () => {
      const subs = [makeActiveUserSub('u1', 'u1@test.com', [makeEmailChannel(EmailRole.CC)])];
      const { svc } = buildService(subs);
      const result = await svc.resolve({ mode: 'resource', referenceType: 'project' });
      expect(result.emailCc).toContain('u1@test.com');
    });

    it('returns empty when no active subscribers', async () => {
      const { svc } = buildService([]);
      const result = await svc.resolve({ mode: 'resource', referenceType: 'project' });
      expect(result.targetUserIds).toHaveLength(0);
      expect(result.emailTo).toHaveLength(0);
    });
  });
});
