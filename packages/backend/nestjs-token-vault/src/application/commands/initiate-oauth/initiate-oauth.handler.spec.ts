import { InitiateOAuthHandler } from '@ssdev-toolkit/nestjs-token-vault/application/commands/initiate-oauth/initiate-oauth.handler';
import { InitiateOAuthCommand } from '@ssdev-toolkit/nestjs-token-vault/application/commands/initiate-oauth/initiate-oauth.command';
import { OAUTH_PROVIDER_REGISTRY } from '@ssdev-toolkit/nestjs-token-vault/application/ports/oauth-provider.port';
import {
  ProviderNotConfiguredError,
  InvalidScopeError,
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';

const makeProvider = (overrides: Partial<{
  isConfigured: boolean;
  providerKey: string;
  allowedScopes: string[];
}> = {}) => ({
  providerKey: overrides.providerKey ?? 'google',
  isConfigured: overrides.isConfigured ?? true,
  getSupportedScopes: jest.fn().mockResolvedValue(
    overrides.allowedScopes ?? ['openid', 'email', 'profile', 'https://mail.google.com/'],
  ),
  getAuthorizationUrl: jest.fn().mockResolvedValue({
    url: 'https://accounts.google.com/o/oauth/v2/auth?state=test-state',
    state: 'test-state',
  }),
  exchangeCode: jest.fn(),
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
  getUserProfile: jest.fn(),
});

const makeCache = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getOrSet: jest.fn(),
});

function makeHandler(providerMap?: Map<string, any>, cache?: any): InitiateOAuthHandler {
  const registry = providerMap ?? new Map([['google', makeProvider()]]);
  const cacheService = cache ?? makeCache();
  return new InitiateOAuthHandler(registry as any, cacheService as any);
}

describe('InitiateOAuthHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('execute()', () => {
    it('returns a url and state', async () => {
      const handler = makeHandler();
      const result = await handler.execute(
        new InitiateOAuthCommand({ provider: 'google', scopes: ['openid', 'email'] }),
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
      expect(typeof result.url).toBe('string');
      expect(typeof result.state).toBe('string');
    });

    it('stores state, ownerSub and codeVerifier in cache', async () => {
      const cache = makeCache();
      const handler = makeHandler(undefined, cache);

      const result = await handler.execute(
        new InitiateOAuthCommand({
          provider: 'google',
          scopes: ['openid'],
          ownerSub: 'user-sub-123',
        }),
      );

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining(result.state),
        expect.objectContaining({ ownerSub: 'user-sub-123', codeVerifier: expect.any(String) }),
        expect.any(Number),
      );
    });

    it('uses a custom state when provided', async () => {
      const handler = makeHandler();
      const result = await handler.execute(
        new InitiateOAuthCommand({
          provider: 'google',
          scopes: ['openid'],
          customState: 'my-custom-state-value-1234',
        }),
      );
      expect(result.state).toBe('my-custom-state-value-1234');
    });

    it('generates a cryptographically random state when none provided', async () => {
      const handler = makeHandler();
      const r1 = await handler.execute(
        new InitiateOAuthCommand({ provider: 'google', scopes: ['openid'] }),
      );
      const r2 = await handler.execute(
        new InitiateOAuthCommand({ provider: 'google', scopes: ['openid'] }),
      );
      expect(r1.state).not.toBe(r2.state);
      // 32 bytes as hex = 64 chars
      expect(r1.state).toHaveLength(64);
    });

    it('throws ProviderNotConfiguredError for an unknown provider', async () => {
      const handler = makeHandler();
      await expect(
        handler.execute(
          new InitiateOAuthCommand({ provider: 'github', scopes: ['openid'] }),
        ),
      ).rejects.toThrow(ProviderNotConfiguredError);
    });

    it('throws ProviderNotConfiguredError when provider is registered but not configured', async () => {
      const unconfigured = makeProvider({ isConfigured: false });
      const registry = new Map([['google', unconfigured]]);
      const handler = makeHandler(registry);

      await expect(
        handler.execute(new InitiateOAuthCommand({ provider: 'google', scopes: ['openid'] })),
      ).rejects.toThrow(ProviderNotConfiguredError);
    });

    it('throws InvalidScopeError when a requested scope is not in the allowlist', async () => {
      const handler = makeHandler();
      await expect(
        handler.execute(
          new InitiateOAuthCommand({
            provider: 'google',
            scopes: ['openid', 'not.whitelisted.scope'],
          }),
        ),
      ).rejects.toThrow(InvalidScopeError);
    });

    it('calls getAuthorizationUrl with the requested scopes and state', async () => {
      const provider = makeProvider();
      const registry = new Map([['google', provider]]);
      const handler = makeHandler(registry);

      const result = await handler.execute(
        new InitiateOAuthCommand({
          provider: 'google',
          scopes: ['openid', 'email'],
          customState: 'fixed-state',
        }),
      );

      expect(provider.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: ['openid', 'email'],
          state: 'fixed-state',
          codeChallenge: expect.any(String),
          codeChallengeMethod: 'S256',
        }),
      );
      expect(result.url).toBeTruthy();
    });

    it('passes provider key as lowercase to registry lookup', async () => {
      const provider = makeProvider({ providerKey: 'google' });
      const registry = new Map([['google', provider]]);
      const handler = makeHandler(registry);

      await expect(
        handler.execute(new InitiateOAuthCommand({ provider: 'GOOGLE', scopes: ['openid'] })),
      ).resolves.toBeTruthy();
    });
  });
});
