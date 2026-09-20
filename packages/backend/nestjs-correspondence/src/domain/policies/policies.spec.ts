/**
 * Domain policy tests — EmailRecipientPolicy & PushRecipientPolicy.
 * Pure unit tests, no framework imports.
 */
import { EmailRecipientPolicy } from '@ssdev-toolkit/nestjs-correspondence/domain/policies/email-recipient.policy';
import { PushRecipientPolicy } from '@ssdev-toolkit/nestjs-correspondence/domain/policies/push-recipient.policy';
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscriptionChannel } from '@ssdev-toolkit/nestjs-correspondence/domain/entities/subscription-channel.entity';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeChannel(channel: ChannelType, enabled: boolean, emailRole?: EmailRole) {
  return SubscriptionChannel.create({
    id: `ch-${channel}-${Math.random()}`,
    subscriptionId: 'sub-1',
    channel,
    enabled,
    emailRole,
  });
}

function makeSub(
  isActive: boolean,
  channels: SubscriptionChannel[] = [],
): ResourceSubscription {
  const sub = ResourceSubscription.createUserSubscription({
    userId: 'user-1',
    userEmail: 'user1@test.com',
    resourceType: 'project',
    via: SubscribedVia.MANUAL,
    channels,
  });
  // Simulate inactive by deactivating
  if (!isActive) sub.deactivate();
  return sub;
}

// ── EmailRecipientPolicy ──────────────────────────────────────────────────────

describe('EmailRecipientPolicy', () => {
  describe('isEmailEnabled()', () => {
    it('returns true for active subscription with no email channel configured (default)', () => {
      const sub = makeSub(true, []);
      expect(EmailRecipientPolicy.isEmailEnabled(sub)).toBe(true);
    });

    it('returns true for active subscription with email channel enabled', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.EMAIL, true)]);
      expect(EmailRecipientPolicy.isEmailEnabled(sub)).toBe(true);
    });

    it('returns false for active subscription with email channel disabled', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.EMAIL, false)]);
      expect(EmailRecipientPolicy.isEmailEnabled(sub)).toBe(false);
    });

    it('returns false for inactive subscription regardless of channel config', () => {
      const sub = makeSub(false, [makeChannel(ChannelType.EMAIL, true)]);
      expect(EmailRecipientPolicy.isEmailEnabled(sub)).toBe(false);
    });
  });

  describe('getEmailRole()', () => {
    it('returns TO when email channel has emailRole TO', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.EMAIL, true, EmailRole.TO)]);
      expect(EmailRecipientPolicy.getEmailRole(sub)).toBe('TO');
    });

    it('returns CC when email channel has emailRole CC', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.EMAIL, true, EmailRole.CC)]);
      expect(EmailRecipientPolicy.getEmailRole(sub)).toBe('CC');
    });

    it('defaults to TO when no email channel is present', () => {
      const sub = makeSub(true, []);
      expect(EmailRecipientPolicy.getEmailRole(sub)).toBe('TO');
    });
  });

  describe('filterEligibleSubscribers()', () => {
    it('returns only active subscriptions with email enabled', () => {
      const active = makeSub(true, [makeChannel(ChannelType.EMAIL, true)]);
      const inactive = makeSub(false, [makeChannel(ChannelType.EMAIL, true)]);
      const disabledEmail = makeSub(true, [makeChannel(ChannelType.EMAIL, false)]);

      const result = EmailRecipientPolicy.filterEligibleSubscribers([
        active,
        inactive,
        disabledEmail,
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(active);
    });

    it('returns empty array when no subscriptions', () => {
      expect(EmailRecipientPolicy.filterEligibleSubscribers([])).toHaveLength(0);
    });

    it('returns all when all are active with email enabled', () => {
      const subs = [
        makeSub(true, [makeChannel(ChannelType.EMAIL, true)]),
        makeSub(true, [makeChannel(ChannelType.EMAIL, true)]),
      ];
      expect(EmailRecipientPolicy.filterEligibleSubscribers(subs)).toHaveLength(2);
    });
  });
});

// ── PushRecipientPolicy ───────────────────────────────────────────────────────

describe('PushRecipientPolicy', () => {
  describe('isPushEnabled()', () => {
    it('returns true for active subscription with no push channel configured (default)', () => {
      const sub = makeSub(true, []);
      expect(PushRecipientPolicy.isPushEnabled(sub)).toBe(true);
    });

    it('returns true for active subscription with push channel enabled', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.PUSH, true)]);
      expect(PushRecipientPolicy.isPushEnabled(sub)).toBe(true);
    });

    it('returns false for active subscription with push channel disabled', () => {
      const sub = makeSub(true, [makeChannel(ChannelType.PUSH, false)]);
      expect(PushRecipientPolicy.isPushEnabled(sub)).toBe(false);
    });

    it('returns false for inactive subscription', () => {
      const sub = makeSub(false, [makeChannel(ChannelType.PUSH, true)]);
      expect(PushRecipientPolicy.isPushEnabled(sub)).toBe(false);
    });
  });

  describe('filterEligibleSubscribers()', () => {
    it('filters out inactive and push-disabled subscriptions', () => {
      const eligible = makeSub(true, [makeChannel(ChannelType.PUSH, true)]);
      const inactive = makeSub(false, [makeChannel(ChannelType.PUSH, true)]);
      const disabled = makeSub(true, [makeChannel(ChannelType.PUSH, false)]);

      const result = PushRecipientPolicy.filterEligibleSubscribers([
        eligible,
        inactive,
        disabled,
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(eligible);
    });

    it('returns empty array when no subscriptions', () => {
      expect(PushRecipientPolicy.filterEligibleSubscribers([])).toHaveLength(0);
    });
  });
});
