import { RefreshTokenHandler } from '@ssdev-toolkit/nestjs-token-vault/application/commands/refresh-token/refresh-token.handler';
import { RefreshTokenCommand } from '@ssdev-toolkit/nestjs-token-vault/application/commands/refresh-token/refresh-token.command';
import {
  NoRefreshTokenError,
  ProviderNotConfiguredError,
  TokenExpiredError,
  TokenNotFoundError,
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EventBus, IEvent } from '@nestjs/cqrs';
import { ILockingPort } from '@ssdev-toolkit/nestjs-persistence';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 10_000);

async function buildToken(
  accessPlain: string,
  expiresAt: Date,
  refreshPlain?: string,
): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext(accessPlain, SECRET);
  const refresh = refreshPlain
    ? await EncryptedToken.fromPlaintext(refreshPlain, SECRET)
    : undefined;
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    accessToken: access,
    refreshToken: refresh,
    expiresAt,
    tokenType: 'Bearer',
  });
}

const makeProvider = (newTokenSet?: {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}, error?: Error) => ({
  providerKey: 'google',
  isConfigured: true,
  refreshToken: error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue(
      newTokenSet ?? { accessToken: 'new-access', expiresAt: FUTURE, tokenType: 'Bearer' },
    ),
  getAuthorizationUrl: jest.fn(),
  exchangeCode: jest.fn(),
  revokeToken: jest.fn(),
  getUserProfile: jest.fn(),
  getSupportedScopes: jest.fn(),
});

const makeLockingService = (): Pick<ILockingPort, 'withLock' | 'withLocks'> => ({
  withLock: jest.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
  withLocks: jest.fn().mockImplementation((_keys: string[], fn: () => Promise<unknown>) => fn()),
});

const makeEventBus = (): Pick<EventBus<IEvent>, 'publishAll'> => ({
  publishAll: jest.fn(),
});

const OPTIONS = { encryption: { secret: SECRET } };

function makeHandler(token: OAuthToken | null, provider: any, overrides: {
  lockingService?: any;
  eventBus?: any;
} = {}) {
  const tokenRepo = {
    findById: jest.fn().mockResolvedValue(token),
    create: jest.fn(),
    update: jest.fn().mockImplementation((_id: string, t: OAuthToken) => Promise.resolve(t)),
    delete: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    findByAttribute: jest.fn(),
    count: jest.fn(),
  };

  const registry = new Map([['google', provider]]);
  const lockingService = overrides.lockingService ?? makeLockingService();
  const eventBus = overrides.eventBus ?? makeEventBus();

  const handler = new RefreshTokenHandler(
    registry as any,
    tokenRepo as any,
    OPTIONS as any,
    lockingService as ILockingPort,
    eventBus as EventBus<IEvent>,
  );

  return { handler, tokenRepo, lockingService, eventBus };
}

describe('RefreshTokenHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws ProviderNotConfiguredError for unknown provider', async () => {
    const provider = makeProvider();
    const registry = new Map<string, any>();
    const handler = new RefreshTokenHandler(
      registry as any,
      { findById: jest.fn() } as any,
      OPTIONS as any,
      makeLockingService() as ILockingPort,
      makeEventBus() as EventBus<IEvent>,
    );
    await expect(
      handler.execute(new RefreshTokenCommand({ tokenId: 'id', provider: 'github' })),
    ).rejects.toThrow(ProviderNotConfiguredError);
  });

  it('throws TokenNotFoundError when token does not exist', async () => {
    const provider = makeProvider();
    const { handler } = makeHandler(null, provider);
    await expect(
      handler.execute(new RefreshTokenCommand({ tokenId: 'missing-id', provider: 'google' })),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('returns the existing access token without calling provider when token is still fresh', async () => {
    const freshToken = await buildToken('still-fresh-access', FUTURE);
    const provider = makeProvider();
    const { handler } = makeHandler(freshToken, provider);

    const result = await handler.execute(
      new RefreshTokenCommand({ tokenId: freshToken.id, provider: 'google' }),
    );

    expect(result).toBe('still-fresh-access');
    expect(provider.refreshToken).not.toHaveBeenCalled();
  });

  it('calls provider.refreshToken and updates the token when expired', async () => {
    const expiredToken = await buildToken('old-access', PAST, 'my-refresh-token');
    const provider = makeProvider({ accessToken: 'new-access', expiresAt: FUTURE });
    const { handler, tokenRepo, eventBus } = makeHandler(expiredToken, provider);

    const result = await handler.execute(
      new RefreshTokenCommand({ tokenId: expiredToken.id, provider: 'google' }),
    );

    expect(result).toBe('new-access');
    expect(provider.refreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'my-refresh-token' }),
    );
    expect(tokenRepo.update).toHaveBeenCalledWith(expiredToken.id, expect.any(OAuthToken));
    expect(eventBus.publishAll).toHaveBeenCalled();
  });

  it('throws NoRefreshTokenError when token is expired but has no refresh token', async () => {
    const expiredToken = await buildToken('old-access', PAST);
    const provider = makeProvider();
    const { handler, tokenRepo } = makeHandler(expiredToken, provider);

    await expect(
      handler.execute(new RefreshTokenCommand({ tokenId: expiredToken.id, provider: 'google' })),
    ).rejects.toThrow(NoRefreshTokenError);

    expect(tokenRepo.delete).toHaveBeenCalledWith(expiredToken.id);
  });

  it('throws TokenExpiredError and deletes token when provider refresh fails', async () => {
    const expiredToken = await buildToken('old', PAST, 'my-refresh');
    const provider = makeProvider(undefined, new Error('invalid_grant'));
    const { handler, tokenRepo, eventBus } = makeHandler(expiredToken, provider);

    await expect(
      handler.execute(new RefreshTokenCommand({ tokenId: expiredToken.id, provider: 'google' })),
    ).rejects.toThrow(TokenExpiredError);

    expect(tokenRepo.delete).toHaveBeenCalledWith(expiredToken.id);
    // A TokenRevokedEvent should be published
    expect(eventBus.publishAll).toHaveBeenCalled();
  });

  it('acquires a distributed lock for the token refresh', async () => {
    const expiredToken = await buildToken('old', PAST, 'ref');
    const provider = makeProvider({ accessToken: 'new', expiresAt: FUTURE });
    const lockingService = makeLockingService();
    const { handler } = makeHandler(expiredToken, provider, { lockingService });

    await handler.execute(
      new RefreshTokenCommand({ tokenId: expiredToken.id, provider: 'google' }),
    );

    expect(lockingService.withLock).toHaveBeenCalledWith(
      expect.stringContaining(expiredToken.id),
      expect.any(Function),
    );
  });

  it('emits TokenRefreshedEvent after a successful update', async () => {
    const expiredToken = await buildToken('old', PAST, 'ref-token');
    const provider = makeProvider({ accessToken: 'new', expiresAt: FUTURE });
    const eventBus = makeEventBus();
    const { handler } = makeHandler(expiredToken, provider, { eventBus });

    await handler.execute(
      new RefreshTokenCommand({ tokenId: expiredToken.id, provider: 'google' }),
    );

    expect(eventBus.publishAll).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ constructor: expect.anything() })]),
    );
  });
});
