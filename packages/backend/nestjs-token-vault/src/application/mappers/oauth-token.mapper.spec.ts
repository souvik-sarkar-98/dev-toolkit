import { OAuthTokenMapper } from '@ssdev-toolkit/nestjs-token-vault/application/mappers/oauth-token.mapper';
import { OAuthAccount } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-account/oauth-account.aggregate';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { TokenScope } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/token-scope.vo';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);

async function buildToken(overrides: {
  email?: string;
  scope?: TokenScope;
  account?: {
    id: string;
    email: string;
    externalId?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    pictureUrl?: string;
    locale?: string;
  };
} = {}): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext('access-token-value', SECRET);
  const refresh = await EncryptedToken.fromPlaintext('refresh-token-value', SECRET);

  return OAuthToken.rehydrate({
    id: 'token-uuid',
    accountId: 'account-uuid',
    clientId: 'client-1',
    provider: 'google',
    email: overrides.email ?? 'user@example.com',
    ownerSub: 'sub-123',
    accessToken: access,
    refreshToken: refresh,
    tokenType: 'Bearer',
    expiresAt: FUTURE,
    scope: overrides.scope,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    account: overrides.account,
  });
}

describe('OAuthTokenMapper', () => {
  describe('toTokenDto()', () => {
    it('maps all basic fields correctly', async () => {
      const token = await buildToken();
      const dto = OAuthTokenMapper.toTokenDto(token);

      expect(dto.id).toBe('token-uuid');
      expect(dto.accountId).toBe('account-uuid');
      expect(dto.clientId).toBe('client-1');
      expect(dto.provider).toBe('google');
      expect(dto.email).toBe('user@example.com');
      expect(dto.tokenType).toBe('Bearer');
      expect(dto.expiresAt).toEqual(FUTURE);
    });

    it('does NOT include accessToken in the DTO', async () => {
      const token = await buildToken();
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect((dto as any).accessToken).toBeUndefined();
    });

    it('does NOT include refreshToken in the DTO', async () => {
      const token = await buildToken();
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect((dto as any).refreshToken).toBeUndefined();
    });

    it('maps scope as an array of strings', async () => {
      const scope = TokenScope.of('openid email profile');
      const token = await buildToken({ scope });
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect(Array.isArray(dto.scope)).toBe(true);
      expect(dto.scope).toContain('email');
      expect(dto.scope).toContain('openid');
      expect(dto.scope).toContain('profile');
    });

    it('sets scope to undefined when token has no scope', async () => {
      const token = await buildToken({ scope: undefined });
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect(dto.scope).toBeUndefined();
    });

    it('includes embedded account snapshot when present', async () => {
      const token = await buildToken({
        account: {
          id: 'acc-uuid',
          email: 'user@example.com',
          name: 'Test User',
          givenName: 'Test',
          familyName: 'User',
        },
      });
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect(dto.account).toBeDefined();
      expect(dto.account!.id).toBe('acc-uuid');
      expect(dto.account!.email).toBe('user@example.com');
    });

    it('sets account to undefined when no snapshot is present', async () => {
      const token = await buildToken({ account: undefined });
      const dto = OAuthTokenMapper.toTokenDto(token);
      expect(dto.account).toBeUndefined();
    });
  });

  describe('toAccountDto()', () => {
    it('maps all fields correctly', () => {
      const account = OAuthAccount.create('google', {
        email: 'alice@example.com',
        externalId: 'sub-123',
        name: 'Alice',
        givenName: 'Alice',
        familyName: 'Smith',
        pictureUrl: 'https://example.com/alice.png',
        locale: 'en-US',
      });

      const dto = OAuthTokenMapper.toAccountDto(account);

      expect(dto.id).toBe(account.id);
      expect(dto.provider).toBe('google');
      expect(dto.email).toBe('alice@example.com');
      expect(dto.externalId).toBe('sub-123');
      expect(dto.name).toBe('Alice');
      expect(dto.givenName).toBe('Alice');
      expect(dto.familyName).toBe('Smith');
      expect(dto.pictureUrl).toBe('https://example.com/alice.png');
      expect(dto.locale).toBe('en-US');
    });

    it('maps optional fields as undefined when absent', () => {
      const account = OAuthAccount.create('microsoft', { email: 'bob@example.com' });
      const dto = OAuthTokenMapper.toAccountDto(account);
      expect(dto.name).toBeUndefined();
      expect(dto.externalId).toBeUndefined();
      expect(dto.pictureUrl).toBeUndefined();
    });
  });
});
