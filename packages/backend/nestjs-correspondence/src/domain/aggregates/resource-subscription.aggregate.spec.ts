/**
 * ResourceSubscription aggregate — pure domain unit tests.
 */
import { ResourceSubscription } from '@ssdev-toolkit/nestjs-correspondence/domain/aggregates/resource-subscription.aggregate';
import { SubscriberType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscriber-type.enum';
import { SubscribedVia } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/subscribed-via.enum';
import { ChannelType } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/channel-type.enum';
import { EmailRole } from '@ssdev-toolkit/nestjs-correspondence/domain/enums/email-role.enum';
import { SubscriptionDeactivatedEvent } from '@ssdev-toolkit/nestjs-correspondence/domain/events/subscription-deactivated.event';

const makeUser = () =>
  ResourceSubscription.createUserSubscription({
    userId: 'user-1',
    userEmail: 'user1@test.com',
    userName: 'User One',
    resourceType: 'project',
    resourceId: 'proj-123',
    via: SubscribedVia.MANUAL,
  });

const makeRole = () =>
  ResourceSubscription.createRoleSubscription({
    roleName: 'MANAGER',
    resourceType: 'project',
    resourceId: 'proj-123',
    via: SubscribedVia.ROLE_DEFAULT,
  });

describe('ResourceSubscription aggregate', () => {
  describe('createUserSubscription()', () => {
    it('sets subscriberType to USER', () => {
      expect(makeUser().subscriberType).toBe(SubscriberType.USER);
    });

    it('sets userId and userEmail', () => {
      const sub = makeUser();
      expect(sub.userId).toBe('user-1');
      expect(sub.userEmail).toBe('user1@test.com');
    });

    it('sets userName', () => {
      expect(makeUser().userName).toBe('User One');
    });

    it('sets resourceType and resourceId', () => {
      const sub = makeUser();
      expect(sub.resourceType).toBe('project');
      expect(sub.resourceId).toBe('proj-123');
    });

    it('defaults isActive to true', () => {
      expect(makeUser().isActive).toBe(true);
    });

    it('generates a UUID id', () => {
      expect(makeUser().id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('initialises channels to empty array when not provided', () => {
      expect(makeUser().channels).toHaveLength(0);
    });
  });

  describe('createRoleSubscription()', () => {
    it('sets subscriberType to ROLE', () => {
      expect(makeRole().subscriberType).toBe(SubscriberType.ROLE);
    });

    it('sets roleName', () => {
      expect(makeRole().roleName).toBe('MANAGER');
    });

    it('does not set userId', () => {
      expect(makeRole().userId).toBeUndefined();
    });

    it('defaults isActive to true', () => {
      expect(makeRole().isActive).toBe(true);
    });

    it('generates a UUID id', () => {
      expect(makeRole().id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('deactivate()', () => {
    it('sets isActive to false', () => {
      const sub = makeUser();
      sub.deactivate();
      expect(sub.isActive).toBe(false);
    });

    it('emits SubscriptionDeactivatedEvent', () => {
      const sub = makeUser();
      sub.deactivate();
      expect(sub.domainEvents).toHaveLength(1);
      expect(sub.domainEvents[0]).toBeInstanceOf(SubscriptionDeactivatedEvent);
    });

    it('SubscriptionDeactivatedEvent carries the aggregate', () => {
      const sub = makeUser();
      sub.deactivate();
      const event = sub.domainEvents[0] as SubscriptionDeactivatedEvent;
      expect(event.snapshot.id).toBe(sub.id);
    });

    it('is idempotent — calling twice does not throw', () => {
      const sub = makeUser();
      sub.deactivate();
      expect(() => sub.deactivate()).not.toThrow();
    });

    it('does not emit a second event on duplicate deactivate', () => {
      const sub = makeUser();
      sub.deactivate();
      sub.clearEvents();
      sub.deactivate();
      expect(sub.domainEvents).toHaveLength(0);
    });
  });

  describe('updateChannelConfig()', () => {
    it('adds a new SubscriptionChannel when none exists', () => {
      const sub = makeUser();
      sub.updateChannelConfig(ChannelType.EMAIL, true, EmailRole.TO);
      expect(sub.channels).toHaveLength(1);
      expect(sub.channels[0].channel).toBe(ChannelType.EMAIL);
      expect(sub.channels[0].enabled).toBe(true);
      expect(sub.channels[0].emailRole).toBe(EmailRole.TO);
    });

    it('updates existing channel instead of creating a duplicate', () => {
      const sub = makeUser();
      sub.updateChannelConfig(ChannelType.EMAIL, true, EmailRole.TO);
      sub.updateChannelConfig(ChannelType.EMAIL, false, EmailRole.CC);
      expect(sub.channels).toHaveLength(1);
      expect(sub.channels[0].enabled).toBe(false);
      expect(sub.channels[0].emailRole).toBe(EmailRole.CC);
    });

    it('can add multiple different channel types', () => {
      const sub = makeUser();
      sub.updateChannelConfig(ChannelType.EMAIL, true);
      sub.updateChannelConfig(ChannelType.PUSH, true);
      expect(sub.channels).toHaveLength(2);
    });
  });

  describe('updateEmail()', () => {
    it('updates userEmail', () => {
      const sub = makeUser();
      sub.updateEmail('newemail@test.com');
      expect(sub.userEmail).toBe('newemail@test.com');
    });

    it('touches the aggregate (updatedAt changes)', () => {
      const sub = makeUser();
      const before = sub.updatedAt;
      sub.updateEmail('new@test.com');
      expect(sub.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
