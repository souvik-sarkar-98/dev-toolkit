import { CompleteOAuthHandler } from '@ssdev-toolkit/nestjs-token-vault/application/commands/complete-oauth/complete-oauth.handler';
import { CompleteOAuthCommand } from '@ssdev-toolkit/nestjs-token-vault/application/commands/complete-oauth/complete-oauth.command';
import {
  DuplicateAuthorizationCodeError,
  InvalidCallbackStateError,
  OAuthCallbackError,
  ProviderNotConfiguredError,
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';
import { OAuthAccount } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-account/oauth-account.aggregate';
import { OAuthToken } from '@ssdev-toolkit/nestjs-token-vault/domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '@ssdev-toolkit/nestjs-token-vault/domain/value-objects/encrypted-token.vo';

const SECRET = 'super-secret-key-that-is-at-least-32chars!!';
const FUTURE = new Date(Date.now() + 3_600_000);

const defaultTokenSet = {
  accessToken: 'provider-access-token',
  refreshToken: 'provider-refresh-token',
  expiresAt: FUTURE,
  tokenType: 'Bearer',
  scope: 'openid email',
  idToken: 'id-tok',
};

const defaultProfile = {
  externalId: 'sub-123',
  email: 'user@example.com',
  name: 'Test User',
};

const makeProvider = (overrides: Partial<{
  isConfigured: boolean;
  tokenSet: typeof defaultTokenSet;
  profile: typeof defaultProfile;
  exchangeError: Error;
}> = {}) => ({
  providerKey: 'google',
  isConfigured: overrides.isConfigured ?? true,
  clientId: 'google-client-id',
  getSupportedScopes: jest.fn().mockResolvedValue(['openid', 'email']),
  getAuthorizationUrl: jest.fn(),
  exchangeCode: overrides.exchangeError
    ? jest.fn().mockRejectedValue(overrides.exchangeError)
    : jest.fn().mockResolvedValue(overrides.tokenSet ?? defaultTokenSet),
  getUserProfile: jest.fn().mockResolvedValue(overrides.profile ?? defaultProfile),
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
});

const makeCache = (stateData?: any, codeUsed?: boolean) => ({
  get: jest.fn().mockImplementation((key: string) => {
    if (key.includes(':state:')) return Promise.resolve(stateData);
    if (key.includes(':code:')) return Promise.resolve(codeUsed ? true : undefined);
    return Promise.resolve(undefined);
  }),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  getOrSet: jest.fn(),
});

const makeTokenRepo = (existingToken?: OAuthToken | null) => ({
  findById: jest.fn().mockResolvedValue(null),
  findByAttribute: jest.fn().mockResolvedValue(existingToken ?? null),
  findPaged: jest.fn().mockResolvedValue({ content: [], totalSize: 0, pageIndex: 0, pageSize: 20 }),
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((t: OAuthToken) => Promise.resolve(t)),
  update: jest.fn().mockImplementation((_id: string, t: OAuthToken) => Promise.resolve(t)),
  delete: jest.fn().mockResolvedValue(undefined),
  count: jest.fn().mockResolvedValue(0),
});

const makeAccountRepo = (existingAccount?: OAuthAccount | null) => ({
  findById: jest.fn().mockResolvedValue(null),
  findByProviderAndEmail: jest.fn().mockResolvedValue(existingAccount ?? null),
  findPaged: jest.fn().mockResolvedValue({ content: [], totalSize: 0, pageIndex: 0, pageSize: 20 }),
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((a: OAuthAccount) => Promise.resolve(a)),
  update: jest.fn().mockImplementation((_id: string, a: OAuthAccount) => Promise.resolve(a)),
  delete: jest.fn().mockResolvedValue(undefined),
  count: jest.fn().mockResolvedValue(0),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

const OPTIONS = {
  encryption: { secret: SECRET },
  googleOAuth: { clientId: 'google-client-id', clientSecret: 'secret', callbackUrl: 'https://cb' },
};

function makeHandler(overrides: {
  provider?: ReturnType<typeof makeProvider>;
  cache?: ReturnType<typeof makeCache>;
  tokenRepo?: ReturnType<typeof makeTokenRepo>;
  accountRepo?: ReturnType<typeof makeAccountRepo>;
  eventBus?: ReturnType<typeof makeEventBus>;
} = {}) {
  const provider = overrides.provider ?? makeProvider();
  const cache = overrides.cache ?? makeCache({ ownerSub: 'user-sub', codeVerifier: 'verifier' });
  const tokenRepo = overrides.tokenRepo ?? makeTokenRepo();
  const accountRepo = overrides.accountRepo ?? makeAccountRepo();
  const eventBus = overrides.eventBus ?? makeEventBus();

  const registry = new Map([['google', provider]]);

  const handler = new CompleteOAuthHandler(
    registry as any,
    tokenRepo as any,
    accountRepo as any,
    OPTIONS as any,
    cache as any,
    eventBus as any,
  );

  return { handler, provider, cache, tokenRepo, accountRepo, eventBus };
}

describe('CompleteOAuthHandler', () => {
  beforeEach(() => jest.clearAllMocks());

  const validCommand = new CompleteOAuthCommand({
    provider: 'google',
    code: 'auth-code-abc',
    state: 'valid-state-xyz',
  });

  it('returns email and tokenId on success', async () => {
    const { handler } = makeHandler();
    const result = await handler.execute(validCommand);
    expect(result.email).toBe('user@example.com');
    expect(typeof result.tokenId).toBe('string');
  });

  it('throws ProviderNotConfiguredError for unknown provider', async () => {
    const { handler } = makeHandler();
    await expect(
      handler.execute(new CompleteOAuthCommand({ provider: 'github', code: 'c', state: 's' })),
    ).rejects.toThrow(ProviderNotConfiguredError);
  });

  it('throws InvalidCallbackStateError when state is not in cache', async () => {
    const cache = makeCache(undefined);
    const { handler } = makeHandler({ cache });
    await expect(handler.execute(validCommand)).rejects.toThrow(InvalidCallbackStateError);
  });

  it('deletes state from cache after validation', async () => {
    const cache = makeCache({ ownerSub: 'u1', codeVerifier: 'cv' });
    const { handler } = makeHandler({ cache });
    await handler.execute(validCommand);
    expect(cache.del).toHaveBeenCalledWith(expect.stringContaining('valid-state-xyz'));
  });

  it('throws DuplicateAuthorizationCodeError for a replayed code', async () => {
    const cache = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key.includes(':state:')) return Promise.resolve({ ownerSub: 'u1', codeVerifier: 'cv' });
        if (key.includes(':code:')) return Promise.resolve(true);
        return Promise.resolve(undefined);
      }),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      getOrSet: jest.fn(),
    };
    const { handler } = makeHandler({ cache });
    await expect(handler.execute(validCommand)).rejects.toThrow(DuplicateAuthorizationCodeError);
  });

  it('throws OAuthCallbackError when code exchange fails', async () => {
    const provider = makeProvider({ exchangeError: new Error('invalid_grant') });
    const cache = makeCache({ ownerSub: 'u1', codeVerifier: 'cv' });
    const { handler } = makeHandler({ provider, cache });
    await expect(handler.execute(validCommand)).rejects.toThrow(OAuthCallbackError);
  });

  it('marks the code as used after a successful exchange', async () => {
    const cache = makeCache({ ownerSub: 'u1', codeVerifier: 'cv' });
    const { handler } = makeHandler({ cache });
    await handler.execute(validCommand);
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('auth-code-abc'),
      true,
      expect.any(Number),
    );
  });

  it('creates a new token when none exists for the email+provider+clientId', async () => {
    const tokenRepo = makeTokenRepo(null);
    const { handler } = makeHandler({ tokenRepo });
    await handler.execute(validCommand);
    expect(tokenRepo.create).toHaveBeenCalled();
    expect(tokenRepo.update).not.toHaveBeenCalled();
  });

  it('updates an existing token when one matches the email+provider+clientId', async () => {
    const existingToken = await (async () => {
      const access = await EncryptedToken.fromPlaintext('old-access', SECRET);
      const refresh = await EncryptedToken.fromPlaintext('old-refresh', SECRET);
      return OAuthToken.create({
        accountId: 'account-1',
        clientId: 'google-client-id',
        provider: 'google',
        email: 'user@example.com',
        accessToken: access,
        refreshToken: refresh,
        tokenType: 'Bearer',
        expiresAt: FUTURE,
      });
    })();
    const tokenRepo = makeTokenRepo(existingToken);
    const { handler } = makeHandler({ tokenRepo });
    await handler.execute(validCommand);
    expect(tokenRepo.update).toHaveBeenCalledWith(existingToken.id, expect.anything());
    expect(tokenRepo.create).not.toHaveBeenCalled();
  });

  it('creates a new OAuthAccount when none exists for provider+email', async () => {
    const accountRepo = makeAccountRepo(null);
    const { handler } = makeHandler({ accountRepo });
    await handler.execute(validCommand);
    expect(accountRepo.create).toHaveBeenCalled();
    expect(accountRepo.update).not.toHaveBeenCalled();
  });

  it('updates an existing OAuthAccount when one exists for provider+email', async () => {
    const existingAccount = OAuthAccount.create('google', defaultProfile);
    const accountRepo = makeAccountRepo(existingAccount);
    const { handler } = makeHandler({ accountRepo });
    await handler.execute(validCommand);
    expect(accountRepo.update).toHaveBeenCalledWith(existingAccount.id, expect.anything());
    expect(accountRepo.create).not.toHaveBeenCalled();
  });

  it('publishes domain events via EventBus after successful save', async () => {
    const eventBus = makeEventBus();
    const { handler } = makeHandler({ eventBus });
    await handler.execute(validCommand);
    expect(eventBus.publishAll).toHaveBeenCalled();
  });
});
