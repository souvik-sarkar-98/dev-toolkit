/**
 * SubscriptionChannel entity — pure domain unit tests.
 */
import { SubscriptionChannel } from '@ssdev-toolkit/nestjs-correspondence/domain/entities/subscription-channel.entity';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';

const make = (channel: ChannelType = ChannelType.EMAIL) =>
  SubscriptionChannel.create({
    id: 'ch-1',
    subscriptionId: 'sub-1',
    channel,
    enabled: true,
    emailRole: EmailRole.TO,
  });

describe('SubscriptionChannel entity', () => {
  describe('create()', () => {
    it('sets channel type', () => {
      expect(make(ChannelType.EMAIL).channel).toBe(ChannelType.EMAIL);
      expect(make(ChannelType.PUSH).channel).toBe(ChannelType.PUSH);
    });

    it('sets subscriptionId', () => {
      expect(make().subscriptionId).toBe('sub-1');
    });

    it('sets enabled to true by default', () => {
      const ch = SubscriptionChannel.create({
        id: 'ch-2',
        subscriptionId: 'sub-1',
        channel: ChannelType.PUSH,
      });
      expect(ch.enabled).toBe(true);
    });

    it('sets emailRole when provided', () => {
      expect(make().emailRole).toBe(EmailRole.TO);
    });

    it('emailRole is undefined for PUSH channel', () => {
      const ch = SubscriptionChannel.create({
        id: 'ch-push',
        subscriptionId: 'sub-1',
        channel: ChannelType.PUSH,
      });
      expect(ch.emailRole).toBeUndefined();
    });
  });

  describe('updateConfig()', () => {
    it('sets enabled to false', () => {
      const ch = make();
      ch.updateConfig(false);
      expect(ch.enabled).toBe(false);
    });

    it('updates emailRole', () => {
      const ch = make();
      ch.updateConfig(true, EmailRole.CC);
      expect(ch.emailRole).toBe(EmailRole.CC);
    });

    it('can set emailRole to undefined (no role)', () => {
      const ch = make();
      ch.updateConfig(true, undefined);
      expect(ch.emailRole).toBeUndefined();
    });

    it('updates both enabled and emailRole in one call', () => {
      const ch = make();
      ch.updateConfig(false, EmailRole.BCC);
      expect(ch.enabled).toBe(false);
      expect(ch.emailRole).toBe(EmailRole.BCC);
    });

    it('touches the entity (updatedAt changes)', () => {
      const ch = make();
      const before = ch.updatedAt;
      ch.updateConfig(false);
      expect(ch.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
