import { RevokeTokenHandler } from '@ssdev-toolkit/nestjs-token-vault/application/commands/revoke-token/revoke-token.handler';
import { RevokeTokenCommand } from '@ssdev-toolkit/nestjs-token-vault/application/commands/revoke-token/revoke-token.command';
import {
  ProviderNotConfiguredError,
  TokenNotFoundError,
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { TokenRevokedEvent } from '@ssdev-toolkit/nestjs-token-vault/domain/events/token-revoked.event';
import { EventBus, IEvent } from '@nestjs/cqrs';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);

async function buildToken(ownerSub?: string): Promise<OAuthToken> {
  const access = await EncryptedToken.fromPlaintext('access-token', SECRET);
  return OAuthToken.create({
    accountId: 'account-1',
    clientId: 'client-1',
    provider: 'google',
    email: 'user@example.com',
    ownerSub,
    accessToken: access,
    expiresAt: FUTURE,
    tokenType: 'Bearer',
  });
}

const makeProvider = (revokeError?: Error) => ({
  providerKey: 'google',
  isConfigured: true,
  revokeToken: revokeError
    ? jest.fn().mockRejectedValue(revokeError)
    : jest.fn().mockResolvedValue(undefined),
  getAuthorizationUrl: jest.fn(),
  exchangeCode: jest.fn(),
  refreshToken: jest.fn(),
  getUserProfile: jest.fn(),
  getSupportedScopes: jest.fn(),
});

const makeEventBus = (): Pick<EventBus<IEvent>, 'publishAll'> => ({
  publishAll: jest.fn(),
});

const OPTIONS = { encryption: { secret: SECRET } };

function makeHandler(token: OAuthToken | null, provider: any, eventBus = makeEventBus()) {
  const tokenRepo = {
    findById: jest.fn().mockResolvedValue(token),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    findByAttribute: jest.fn(),
    count: jest.fn(),
  };

  const registry = new Map([['google', provider]]);

  const handler = new RevokeTokenHandler(
    registry as any,
    tokenRepo as any,
    OPTIONS as any,
    eventBus as EventBus<IEvent>,
  );

  return { handler, tokenRepo, eventBus };
}

describe('RevokeTokenHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws ProviderNotConfiguredError for unknown provider', async () => {
    const registry = new Map<string, any>();
    const handler = new RevokeTokenHandler(
      registry as any,
      { findById: jest.fn() } as any,
      OPTIONS as any,
      makeEventBus() as EventBus<IEvent>,
    );
    await expect(
      handler.execute(new RevokeTokenCommand({ tokenId: 'id', provider: 'github' })),
    ).rejects.toThrow(ProviderNotConfiguredError);
  });

  it('throws TokenNotFoundError when token does not exist', async () => {
    const provider = makeProvider();
    const { handler } = makeHandler(null, provider);
    await expect(
      handler.execute(new RevokeTokenCommand({ tokenId: 'missing', provider: 'google' })),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('throws TokenNotFoundError when callerSub does not own the token', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider();
    const { handler } = makeHandler(token, provider);
    await expect(
      handler.execute(
        new RevokeTokenCommand({
          tokenId: token.id,
          provider: 'google',
          callerSub: 'different-sub',
          isAdmin: false,
        }),
      ),
    ).rejects.toThrow(TokenNotFoundError);
  });

  it('allows admin to revoke any token regardless of ownerSub', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider();
    const { handler, tokenRepo } = makeHandler(token, provider);

    await handler.execute(
      new RevokeTokenCommand({
        tokenId: token.id,
        provider: 'google',
        callerSub: 'admin-sub',
        isAdmin: true,
      }),
    );

    expect(tokenRepo.delete).toHaveBeenCalledWith(token.id);
  });

  it('calls provider.revokeToken with the decrypted access token', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider();
    const { handler } = makeHandler(token, provider);

    await handler.execute(
      new RevokeTokenCommand({
        tokenId: token.id,
        provider: 'google',
        callerSub: 'owner-sub',
      }),
    );

    expect(provider.revokeToken).toHaveBeenCalledWith('access-token');
  });

  it('deletes the local DB record even when provider revocation fails', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider(new Error('Network error'));
    const { handler, tokenRepo } = makeHandler(token, provider);

    await handler.execute(
      new RevokeTokenCommand({
        tokenId: token.id,
        provider: 'google',
        callerSub: 'owner-sub',
      }),
    );

    expect(tokenRepo.delete).toHaveBeenCalledWith(token.id);
  });

  it('publishes TokenRevokedEvent after deletion', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider();
    const eventBus = makeEventBus();
    const { handler } = makeHandler(token, provider, eventBus);

    await handler.execute(
      new RevokeTokenCommand({ tokenId: token.id, provider: 'google', callerSub: 'owner-sub' }),
    );

    expect(eventBus.publishAll).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(TokenRevokedEvent)]),
    );
  });

  it('deletes the record on successful provider revocation', async () => {
    const token = await buildToken('owner-sub');
    const provider = makeProvider();
    const { handler, tokenRepo } = makeHandler(token, provider);

    await handler.execute(
      new RevokeTokenCommand({ tokenId: token.id, provider: 'google', callerSub: 'owner-sub' }),
    );

    expect(tokenRepo.delete).toHaveBeenCalledWith(token.id);
    expect(provider.revokeToken).toHaveBeenCalledTimes(1);
  });
});
