import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { TokenRefreshPolicy } from '@ssdev-toolkit/nestjs-token-vault/domain/policies/token-refresh.policy';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';

async function makeToken(expiresAt?: Date): Promise<OAuthToken> {
  const accessToken = await EncryptedToken.fromPlaintext('access', SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    accessToken,
    expiresAt,
    tokenType: 'Bearer',
  });
}

describe('TokenRefreshPolicy', () => {
  describe('needsRefresh()', () => {
    it('returns true when the token is already expired', async () => {
      const token = await makeToken(new Date(Date.now() - 60_000));
      expect(TokenRefreshPolicy.needsRefresh(token)).toBe(true);
    });

    it('returns true when the token will expire within the 5-minute buffer', async () => {
      const token = await makeToken(new Date(Date.now() + 2 * 60 * 1000));
      expect(TokenRefreshPolicy.needsRefresh(token)).toBe(true);
    });

    it('returns false when the token has more than 5 minutes remaining', async () => {
      const token = await makeToken(new Date(Date.now() + 60 * 60 * 1000));
      expect(TokenRefreshPolicy.needsRefresh(token)).toBe(false);
    });

    it('returns true when no expiresAt is set (unknown lifetime)', async () => {
      const token = await makeToken(undefined);
      expect(TokenRefreshPolicy.needsRefresh(token)).toBe(true);
    });

    it('respects a custom buffer via the second argument', async () => {
      const token = await makeToken(new Date(Date.now() + 8 * 60 * 1000));
      expect(TokenRefreshPolicy.needsRefresh(token, 10)).toBe(true);
      expect(TokenRefreshPolicy.needsRefresh(token, 2)).toBe(false);
    });
  });

  describe('isHardExpired()', () => {
    it('returns true when the token is strictly past its expiry', async () => {
      const token = await makeToken(new Date(Date.now() - 1000));
      expect(TokenRefreshPolicy.isHardExpired(token)).toBe(true);
    });

    it('returns false when the token still has time remaining (even within 5-min buffer)', async () => {
      const token = await makeToken(new Date(Date.now() + 3 * 60 * 1000));
      expect(TokenRefreshPolicy.isHardExpired(token)).toBe(false);
    });

    it('returns true when no expiresAt is set', async () => {
      const token = await makeToken(undefined);
      expect(TokenRefreshPolicy.isHardExpired(token)).toBe(true);
    });
  });
});
