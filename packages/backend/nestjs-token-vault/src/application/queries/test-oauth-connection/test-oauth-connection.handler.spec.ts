import { TestOAuthConnectionHandler } from './test-oauth-connection.handler';
import { TokenNotFoundError } from '../../../domain/errors/token-vault.errors';

describe('TestOAuthConnectionHandler', () => {
  const provider = 'google';
  const tokenId = '7c2e5b84-13af-4d6c-8e90-5a1f3b2c7d68';
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  function makeToken(overrides: Record<string, unknown> = {}) {
    const expires = (overrides.expiresAt as Date | undefined) ?? expiresAt;
    const expired =
      typeof overrides.isExpired === 'boolean'
        ? overrides.isExpired
        : !expires || expires.getTime() <= Date.now() + 5 * 60 * 1000;
    const { isExpired: _ignored, ...rest } = overrides;
    return {
      id: tokenId,
      provider,
      email: 'asha.verma@example.org',
      ownerSub: 'user-1',
      expiresAt: expires,
      isExpired: () => expired,
      ...rest,
    };
  }

  function makeHandler(deps: {
    token?: ReturnType<typeof makeToken> | null;
    accessToken?: string;
    profile?: { email: string; name?: string };
    getValidTokenError?: Error;
    profileError?: Error;
  }) {
    const tokenRepo = {
      findById: jest.fn().mockResolvedValue(deps.token === undefined ? makeToken() : deps.token),
    };
    const oauthProvider = {
      isConfigured: true,
      getUserProfile: jest.fn().mockImplementation(async () => {
        if (deps.profileError) throw deps.profileError;
        return deps.profile ?? { email: 'asha.verma@example.org', name: 'Asha Verma' };
      }),
    };
    const registry = new Map([[provider, oauthProvider]]);
    const queryBus = {
      execute: jest.fn().mockImplementation(async () => {
        if (deps.getValidTokenError) throw deps.getValidTokenError;
        return deps.accessToken ?? 'access-token';
      }),
    };
    const handler = new TestOAuthConnectionHandler(
      tokenRepo as any,
      registry as any,
      queryBus as any,
    );
    return { handler, tokenRepo, oauthProvider, queryBus };
  }

  it('returns ok with profile details when the connection works', async () => {
    const { handler, oauthProvider } = makeHandler({});
    const result = await handler.execute({
      params: { provider, tokenId, callerSub: 'user-1', isAdmin: false },
    } as any);

    expect(result.ok).toBe(true);
    expect(result.email).toBe('asha.verma@example.org');
    expect(result.accountName).toBe('Asha Verma');
    expect(result.refreshed).toBe(false);
    expect(oauthProvider.getUserProfile).toHaveBeenCalledWith('access-token');
  });

  it('hides tokens owned by someone else from non-admins', async () => {
    const { handler } = makeHandler({ token: makeToken({ ownerSub: 'other-user' }) });
    await expect(
      handler.execute({
        params: { provider, tokenId, callerSub: 'user-1', isAdmin: false },
      } as any),
    ).rejects.toBeInstanceOf(TokenNotFoundError);
  });

  it('returns ok:false without exposing the provider failure', async () => {
    const { handler } = makeHandler({
      profileError: new Error('provider unavailable'),
    });
    const result = await handler.execute({
      params: { provider, tokenId, isAdmin: true },
    } as any);

    expect(result.ok).toBe(false);
    expect(result.message).toBe(
      'Connection test failed. Reconnect the account or try again later.',
    );
    expect(result.message).not.toContain('provider unavailable');
  });

  it('marks refreshed when the stored token needed refresh', async () => {
    const { handler } = makeHandler({
      token: makeToken({
        expiresAt: new Date(Date.now() - 1000),
        isExpired: true,
      }),
    });
    const result = await handler.execute({
      params: { provider, tokenId, isAdmin: true },
    } as any);

    expect(result.ok).toBe(true);
    expect(result.refreshed).toBe(true);
  });
});
