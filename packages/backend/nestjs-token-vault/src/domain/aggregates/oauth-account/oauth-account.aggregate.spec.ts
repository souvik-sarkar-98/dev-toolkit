import { OAuthAccount } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-account/oauth-account.aggregate';
import { AccountConnectedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/account-connected.event';
import { AccountDisconnectedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/account-disconnected.event';

const profile = {
  externalId: 'sub-123',
  email: 'alice@example.com',
  name: 'Alice Example',
  givenName: 'Alice',
  familyName: 'Example',
  pictureUrl: 'https://example.com/alice.png',
  locale: 'en-US',
};

describe('OAuthAccount aggregate', () => {
  describe('create()', () => {
    it('sets provider and all profile fields', () => {
      const account = OAuthAccount.create('google', profile);

      expect(account.provider).toBe('google');
      expect(account.email).toBe('alice@example.com');
      expect(account.externalId).toBe('sub-123');
      expect(account.name).toBe('Alice Example');
      expect(account.givenName).toBe('Alice');
      expect(account.familyName).toBe('Example');
      expect(account.pictureUrl).toBe('https://example.com/alice.png');
      expect(account.locale).toBe('en-US');
    });

    it('generates a unique UUID id', () => {
      const a = OAuthAccount.create('google', profile);
      const b = OAuthAccount.create('google', profile);
      expect(a.id).not.toBe(b.id);
      expect(a.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('emits AccountConnectedEvent with the new account', () => {
      const account = OAuthAccount.create('google', profile);
      const events = account.domainEvents;

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AccountConnectedEvent);
      const event = events[0] as AccountConnectedEvent;
      expect(event.snapshot.id).toBe(account.id);
      expect(event.aggregateId).toBe(account.id);
    });

    it('stores minimal profile when optional fields are absent', () => {
      const account = OAuthAccount.create('microsoft', { email: 'bob@example.com' });
      expect(account.email).toBe('bob@example.com');
      expect(account.name).toBeUndefined();
      expect(account.externalId).toBeUndefined();
    });
  });

  describe('updateProfile()', () => {
    it('updates email, name, and all optional fields', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();

      account.updateProfile({
        email: 'alice-new@example.com',
        name: 'Alice Updated',
        givenName: 'Alice',
        familyName: 'Updated',
        pictureUrl: 'https://example.com/new.png',
        locale: 'fr-FR',
        externalId: 'sub-456',
      });

      expect(account.email).toBe('alice-new@example.com');
      expect(account.name).toBe('Alice Updated');
      expect(account.familyName).toBe('Updated');
      expect(account.pictureUrl).toBe('https://example.com/new.png');
      expect(account.locale).toBe('fr-FR');
      expect(account.externalId).toBe('sub-456');
    });

    it('keeps existing externalId when new profile omits it', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();

      account.updateProfile({ email: 'alice@example.com' });

      expect(account.externalId).toBe('sub-123');
    });

    it('touches updatedAt', () => {
      const account = OAuthAccount.create('google', profile);
      const originalUpdatedAt = account.updatedAt;
      account.clearEvents();

      // Ensure time progresses slightly
      jest.useFakeTimers();
      jest.advanceTimersByTime(1);

      account.updateProfile({ email: 'alice2@example.com' });

      jest.useRealTimers();
      expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('does not emit a domain event on updateProfile', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();
      account.updateProfile({ email: 'alice@example.com', name: 'New Name' });
      expect(account.domainEvents).toHaveLength(0);
    });
  });

  describe('disconnect()', () => {
    it('emits AccountDisconnectedEvent', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();

      account.disconnect();

      const events = account.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AccountDisconnectedEvent);
      const event = events[0] as AccountDisconnectedEvent;
      expect(event.snapshot.id).toBe(account.id);
      expect(event.aggregateId).toBe(account.id);
    });

    it('disconnect() called twice emits events each time (no idempotency guard)', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();

      account.disconnect();
      account.disconnect();

      expect(account.domainEvents).toHaveLength(2);
      expect(account.domainEvents.every((e) => e instanceof AccountDisconnectedEvent)).toBe(true);
    });

    it('touches updatedAt on disconnect', () => {
      const account = OAuthAccount.create('google', profile);
      const before = account.updatedAt;
      account.clearEvents();
      account.disconnect();
      expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
