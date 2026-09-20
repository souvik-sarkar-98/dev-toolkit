import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { TokenScope } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/token-scope.vo';
import { TokenRefreshedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/token-refreshed.event';
import { TokenRevokedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/token-revoked.event';
import { NoRefreshTokenError } from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';

async function makeEncryptedToken(plaintext = 'access-token-value'): Promise<EncryptedToken> {
  return EncryptedToken.fromPlaintext(plaintext, SECRET);
}

async function makeToken(overrides: Partial<{
  expiresAt: Date | undefined;
  refreshToken: EncryptedToken | null;
  scope: TokenScope | null;
}> = {}): Promise<OAuthToken> {
  const accessToken = await makeEncryptedToken('access-token');
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    ownerSub: 'sub-123',
    accessToken,
    expiresAt: overrides.expiresAt,
    refreshToken: overrides.refreshToken ?? undefined,
    scope: overrides.scope ?? undefined,
    tokenType: 'Bearer',
  });
}

describe('OAuthToken aggregate', () => {
  describe('create()', () => {
    it('sets all fields from the factory call', async () => {
      const accessToken = await makeEncryptedToken('access');
      const refreshToken = await makeEncryptedToken('refresh');
      const scope = TokenScope.of('openid email');
      const expiresAt = new Date(Date.now() + 3_600_000);

      const token = OAuthToken.create({
        accountId: 'account-1',
        clientId: 'client-1',
        provider: 'google',
        email: 'user@example.com',
        ownerSub: 'sub-abc',
        accessToken,
        refreshToken,
        expiresAt,
        scope,
        tokenType: 'Bearer',
      });

      expect(token.accountId).toBe('account-1');
      expect(token.clientId).toBe('client-1');
      expect(token.provider).toBe('google');
      expect(token.email).toBe('user@example.com');
      expect(token.ownerSub).toBe('sub-abc');
      expect(token.accessToken).toBe(accessToken);
      expect(token.refreshToken).toBe(refreshToken);
      expect(token.expiresAt).toBe(expiresAt);
      expect(token.tokenType).toBe('Bearer');
      expect(token.scope?.toString()).toBe('email openid');
    });

    it('generates a unique UUID id', async () => {
      const t1 = await makeToken();
      const t2 = await makeToken();
      expect(t1.id).not.toBe(t2.id);
      expect(t1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('does not emit any domain events on creation', async () => {
      const token = await makeToken();
      expect(token.domainEvents).toHaveLength(0);
    });

    it('sets refreshToken to null when not provided', async () => {
      const token = await makeToken({ refreshToken: null });
      expect(token.refreshToken).toBeNull();
    });
  });

  describe('refresh()', () => {
    it('updates accessToken and emits TokenRefreshedEvent', async () => {
      const token = await makeToken({ expiresAt: new Date(Date.now() - 1000) });
      token.clearEvents();

      const newAccess = await makeEncryptedToken('new-access-token');
      const newExpiry = new Date(Date.now() + 3_600_000);

      token.refresh({ accessToken: newAccess, expiresAt: newExpiry });

      expect(token.accessToken).toBe(newAccess);
      expect(token.expiresAt).toEqual(newExpiry);
      expect(token.domainEvents).toHaveLength(1);
      expect(token.domainEvents[0]).toBeInstanceOf(TokenRefreshedEvent);
      const event = token.domainEvents[0] as TokenRefreshedEvent;
      expect(event.snapshot.id).toBe(token.id);
    });

    it('updates refreshToken when new one is provided', async () => {
      const oldRefresh = await makeEncryptedToken('old-refresh');
      const token = await makeToken({ refreshToken: oldRefresh });
      token.clearEvents();

      const newRefresh = await makeEncryptedToken('new-refresh');
      token.refresh({
        accessToken: await makeEncryptedToken('new-access'),
        refreshToken: newRefresh,
      });

      expect(token.refreshToken).toBe(newRefresh);
    });

    it('keeps old refreshToken when refresh does not supply one', async () => {
      const oldRefresh = await makeEncryptedToken('old-refresh');
      const token = await makeToken({ refreshToken: oldRefresh });
      token.clearEvents();

      token.refresh({ accessToken: await makeEncryptedToken('new-access') });

      expect(token.refreshToken).toBe(oldRefresh);
    });

    it('touches updatedAt on refresh', async () => {
      const token = await makeToken();
      const before = token.updatedAt;
      token.clearEvents();
      token.refresh({ accessToken: await makeEncryptedToken('new') });
      expect(token.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('revoke()', () => {
    it('emits TokenRevokedEvent', async () => {
      const token = await makeToken();
      token.clearEvents();

      token.revoke();

      expect(token.domainEvents).toHaveLength(1);
      expect(token.domainEvents[0]).toBeInstanceOf(TokenRevokedEvent);
      const event = token.domainEvents[0] as TokenRevokedEvent;
      expect(event.snapshot.id).toBe(token.id);
    });

    it('touches updatedAt on revoke', async () => {
      const token = await makeToken();
      const before = token.updatedAt;
      token.clearEvents();
      token.revoke();
      expect(token.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('isExpired()', () => {
    it('returns true when expiresAt is more than 5 minutes in the past', async () => {
      const token = await makeToken({
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      expect(token.isExpired()).toBe(true);
    });

    it('returns true when within the 5-minute buffer before expiry', async () => {
      const token = await makeToken({
        expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      });
      expect(token.isExpired()).toBe(true);
    });

    it('returns false when well past the 5-minute buffer', async () => {
      const token = await makeToken({
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(token.isExpired()).toBe(false);
    });

    it('returns true when no expiresAt is set', async () => {
      const token = await makeToken({ expiresAt: undefined });
      expect(token.isExpired()).toBe(true);
    });

    it('respects a custom buffer parameter', async () => {
      const token = await makeToken({
        expiresAt: new Date(Date.now() + 8 * 60 * 1000),
      });
      // With 10-minute buffer the token at +8 min should be treated as expired
      expect(token.isExpired(10)).toBe(true);
      // With 2-minute buffer the same token is fine
      expect(token.isExpired(2)).toBe(false);
    });
  });
});
