import { GetValidTokenHandler } from '@ssdev-toolkit/nestjs-token-vault/application/queries/get-valid-token/get-valid-token.handler';
import { GetValidTokenQuery } from '@ssdev-toolkit/nestjs-token-vault/application/queries/get-valid-token/get-valid-token.query';
import {
  AmbiguousTokenSelectionError,
  ProviderNotConfiguredError,
  TokenNotFoundError,
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);
const PAST = new Date(Date.now() - 10_000);

async function buildFreshToken(
  accessPlain: string,
  email = 'user@example.com',
  ownerSub?: string,
): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext(accessPlain, SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email,
    ownerSub,
    accessToken: access,
    expiresAt: FUTURE,
    tokenType: 'Bearer',
  });
}

async function buildExpiredToken(accessPlain: string): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext(accessPlain, SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    accessToken: access,
    expiresAt: PAST,
    tokenType: 'Bearer',
  });
}

const makeProvider = (isConfigured = true) => ({
  providerKey: 'google',
  isConfigured,
  getSupportedScopes: jest.fn().mockResolvedValue(['openid', 'email']),
  getAuthorizationUrl: jest.fn(),
  exchangeCode: jest.fn(),
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
  getUserProfile: jest.fn(),
});

const makeCommandBus = (result?: string) => ({
  execute: jest.fn().mockResolvedValue(result ?? 'refreshed-access-token'),
});

const OPTIONS = { encryption: { secret: SECRET } };

function makeHandler(
  tokens: OAuthToken[],
  byIdToken: OAuthToken | null = null,
  commandBusResult?: string,
) {
  const tokenRepo = {
    findById: jest.fn().mockResolvedValue(byIdToken),
    findAll: jest.fn().mockResolvedValue(tokens),
    findPaged: jest.fn(),
    findByAttribute: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const provider = makeProvider();
  const registry = new Map([['google', provider]]);
  const commandBus = makeCommandBus(commandBusResult);

  const handler = new GetValidTokenHandler(
    tokenRepo as any,
    registry as any,
    OPTIONS as any,
    commandBus as any,
  );

  return { handler, tokenRepo, commandBus, provider };
}

describe('GetValidTokenHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the decrypted access token when not expired', async () => {
    const freshToken = await buildFreshToken('live-access-token');
    const { handler } = makeHandler([freshToken]);

    const result = await handler.execute(
      new GetValidTokenQuery({ provider: 'google', scope: 'openid' }),
    );

    expect(result).toBe('live-access-token');
  });

  it('calls RefreshTokenCommand and returns new token when expired', async () => {
    const expiredToken = await buildExpiredToken('stale-access');
    const { handler, commandBus } = makeHandler([expiredToken], null, 'fresh-refreshed-token');

    const result = await handler.execute(
      new GetValidTokenQuery({ provider: 'google', scope: 'openid' }),
    );

    expect(commandBus.execute).toHaveBeenCalled();
    expect(result).toBe('fresh-refreshed-token');
  });

  it('throws ProviderNotConfiguredError for unknown provider', async () => {
    const registry = new Map<string, any>();
    const handler = new GetValidTokenHandler(
      { findAll: jest.fn() } as any,
      registry as any,
      OPTIONS as any,
      { execute: jest.fn() } as any,
    );
    await expect(
      handler.execute(new GetValidTokenQuery({ provider: 'github', scope: 'openid' })),
    ).rejects.toThrow(ProviderNotConfiguredError);
  });

  it('throws TokenNotFoundError when no token matches the filter', async () => {
    const { handler } = makeHandler([]);
    await expect(
      handler.execute(new GetValidTokenQuery({ provider: 'google', scope: 'openid' })),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('resolves by tokenId directly via findById, bypassing findAll', async () => {
    const freshToken = await buildFreshToken('tok-by-id');
    const { handler, tokenRepo } = makeHandler([], freshToken);

    const result = await handler.execute(
      new GetValidTokenQuery({ provider: 'google', tokenId: freshToken.id }),
    );

    expect(result).toBe('tok-by-id');
    expect(tokenRepo.findAll).not.toHaveBeenCalled();
    expect(tokenRepo.findById).toHaveBeenCalledWith(freshToken.id);
  });

  it('throws TokenNotFoundError when tokenId is given but not found', async () => {
    const { handler } = makeHandler([], null);
    await expect(
      handler.execute(new GetValidTokenQuery({ provider: 'google', tokenId: 'non-existent-id' })),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('throws TokenNotFoundError when tokenId belongs to a different provider', async () => {
    const access = await EncryptedToken.fromPlaintext('tok', SECRET);
    const foreignToken = OAuthToken.create({
      accountId: 'a1',
      clientId: 'c1',
      provider: 'microsoft',
      email: 'u@e.com',
      accessToken: access,
      expiresAt: FUTURE,
      tokenType: 'Bearer',
    });
    const { handler } = makeHandler([], foreignToken);

    await expect(
      handler.execute(new GetValidTokenQuery({ provider: 'google', tokenId: foreignToken.id })),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('throws AmbiguousTokenSelectionError when multiple tokens match and email disambiguator is supplied', async () => {
    const t1 = await buildFreshToken('tok-1', 'shared@example.com');
    const t2 = await buildFreshToken('tok-2', 'shared@example.com');
    const { handler } = makeHandler([t1, t2]);

    await expect(
      handler.execute(
        new GetValidTokenQuery({ provider: 'google', email: 'shared@example.com', scope: 'openid' }),
      ),
    ).rejects.toThrow(AmbiguousTokenSelectionError);
  });

  it('picks most recently updated when multiple tokens match without disambiguator (no error)', async () => {
    const older = await buildFreshToken('tok-old');
    const newer = await buildFreshToken('tok-new');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    jest.spyOn(newer as any, 'updatedAt', 'get').mockReturnValue(now);
    jest.spyOn(older as any, 'updatedAt', 'get').mockReturnValue(yesterday);

    const { handler } = makeHandler([older, newer]);
    const result = await handler.execute(
      new GetValidTokenQuery({ provider: 'google', scope: 'openid' }),
    );
    expect(result).toBe('tok-new');
  });

  it('forwards email filter to tokenRepo.findAll', async () => {
    const token = await buildFreshToken('tok-email', 'specific@example.com');
    const { handler, tokenRepo } = makeHandler([token]);

    await handler.execute(
      new GetValidTokenQuery({ provider: 'google', email: 'specific@example.com' }),
    );

    expect(tokenRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'specific@example.com' }),
    );
  });

  it('forwards ownerSub filter to tokenRepo.findAll', async () => {
    const token = await buildFreshToken('tok-owner', 'u@e.com', 'sub-123');
    const { handler, tokenRepo } = makeHandler([token]);

    await handler.execute(
      new GetValidTokenQuery({ provider: 'google', ownerSub: 'sub-123' }),
    );

    expect(tokenRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ ownerSub: 'sub-123' }),
    );
  });

  it('handles scope array by joining into a single scope filter string', async () => {
    const token = await buildFreshToken('tok');
    const { handler, tokenRepo } = makeHandler([token]);

    await handler.execute(
      new GetValidTokenQuery({ provider: 'google', scope: ['openid', 'email'] }),
    );

    expect(tokenRepo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'openid email' }),
    );
  });
});
