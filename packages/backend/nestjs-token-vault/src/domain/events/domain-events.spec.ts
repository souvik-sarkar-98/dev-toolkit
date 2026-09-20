import { OAuthAccount } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-account/oauth-account.aggregate';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { AccountConnectedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/account-connected.event';
import { AccountDisconnectedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/account-disconnected.event';
import { TokenRefreshedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/token-refreshed.event';
import { TokenRevokedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/token-revoked.event';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';

const profile = { email: 'user@example.com', name: 'Test User' };

async function makeOAuthToken(): Promise<OAuthToken> {
  const accessToken = await EncryptedToken.fromPlaintext('access', SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    accessToken,
    tokenType: 'Bearer',
  });
}

describe('Domain events', () => {
  describe('AccountConnectedEvent', () => {
    it('carries the OAuthAccount reference', () => {
      const account = OAuthAccount.create('google', profile);
      const event = account.domainEvents[0] as AccountConnectedEvent;

      expect(event).toBeInstanceOf(AccountConnectedEvent);
      expect(event.snapshot.id).toBe(account.id);
    });

    it('has the correct aggregateId', () => {
      const account = OAuthAccount.create('google', profile);
      const event = account.domainEvents[0] as AccountConnectedEvent;
      expect(event.aggregateId).toBe(account.id);
    });

    it('has an occurredAt set to approximately now', () => {
      const before = new Date();
      const account = OAuthAccount.create('google', profile);
      const after = new Date();
      const event = account.domainEvents[0] as AccountConnectedEvent;

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('AccountDisconnectedEvent', () => {
    it('carries the OAuthAccount reference', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();
      account.disconnect();

      const event = account.domainEvents[0] as AccountDisconnectedEvent;
      expect(event).toBeInstanceOf(AccountDisconnectedEvent);
      expect(event.snapshot.id).toBe(account.id);
    });

    it('has the correct aggregateId', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();
      account.disconnect();

      const event = account.domainEvents[0] as AccountDisconnectedEvent;
      expect(event.aggregateId).toBe(account.id);
    });

    it('has an occurredAt', () => {
      const account = OAuthAccount.create('google', profile);
      account.clearEvents();
      account.disconnect();
      const event = account.domainEvents[0] as AccountDisconnectedEvent;
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('TokenRefreshedEvent', () => {
    it('carries the OAuthToken reference', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      const newAccess = await EncryptedToken.fromPlaintext('new-access', SECRET);
      token.refresh({ accessToken: newAccess });

      const event = token.domainEvents[0] as TokenRefreshedEvent;
      expect(event).toBeInstanceOf(TokenRefreshedEvent);
      expect(event.snapshot.id).toBe(token.id);
    });

    it('has the correct aggregateId', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      token.refresh({ accessToken: await EncryptedToken.fromPlaintext('new', SECRET) });

      const event = token.domainEvents[0] as TokenRefreshedEvent;
      expect(event.aggregateId).toBe(token.id);
    });

    it('has an occurredAt', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      token.refresh({ accessToken: await EncryptedToken.fromPlaintext('new', SECRET) });

      const event = token.domainEvents[0] as TokenRefreshedEvent;
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('TokenRevokedEvent', () => {
    it('carries the OAuthToken reference', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      token.revoke();

      const event = token.domainEvents[0] as TokenRevokedEvent;
      expect(event).toBeInstanceOf(TokenRevokedEvent);
      expect(event.snapshot.id).toBe(token.id);
    });

    it('has the correct aggregateId', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      token.revoke();

      const event = token.domainEvents[0] as TokenRevokedEvent;
      expect(event.aggregateId).toBe(token.id);
    });

    it('has an occurredAt', async () => {
      const token = await makeOAuthToken();
      token.clearEvents();
      token.revoke();
      const event = token.domainEvents[0] as TokenRevokedEvent;
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });
});
