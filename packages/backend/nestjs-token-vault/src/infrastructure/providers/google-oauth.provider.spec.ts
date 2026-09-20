import { GoogleOAuthProvider } from '@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/google-oauth.provider';
import { GOOGLE_SCOPES } from '@ssdev-toolkit/nestjs-token-vault/scopes';

const ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-32chars';

const makeOptions = (overrides?: object) => ({
  encryption: { secret: ENCRYPTION_KEY },
  googleOAuth: {
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
    callbackUrl: 'https://example.com/auth/oauth/google/callback',
  },
  ...overrides,
});

const makeEventBus = () => ({ publish: jest.fn(), publishAll: jest.fn() });

function makeProvider(optionOverrides?: object): GoogleOAuthProvider {
  return new GoogleOAuthProvider(makeOptions(optionOverrides) as any, makeEventBus() as any);
}

describe('GoogleOAuthProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isConfigured', () => {
    it('is true when clientId and clientSecret are provided', () => {
      const provider = makeProvider();
      expect(provider.isConfigured).toBe(true);
    });

    it('is false when googleOAuth block is absent', () => {
      const provider = new GoogleOAuthProvider(
        { encryption: { secret: ENCRYPTION_KEY } } as any,
        makeEventBus() as any,
      );
      expect(provider.isConfigured).toBe(false);
    });

    it('has providerKey = "google"', () => {
      expect(makeProvider().providerKey).toBe('google');
    });
  });

  describe('getSupportedScopes()', () => {
    it('always includes OIDC defaults', async () => {
      const provider = makeProvider();
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain('openid');
      expect(scopes).toContain('email');
      expect(scopes).toContain('profile');
    });

    it('falls back to gmailFull, calendar, driveFull when allowedScopes is not configured', async () => {
      const provider = makeProvider();
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain(GOOGLE_SCOPES.gmailFull);
      expect(scopes).toContain(GOOGLE_SCOPES.calendar);
      expect(scopes).toContain(GOOGLE_SCOPES.driveFull);
    });

    it('uses allowedScopes when configured, without adding fallback scopes', async () => {
      const provider = makeProvider({
        googleOAuth: {
          clientId: 'id',
          clientSecret: 'secret',
          callbackUrl: 'https://example.com/cb',
          allowedScopes: [GOOGLE_SCOPES.gmailSend],
        },
      });
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain(GOOGLE_SCOPES.gmailSend);
      expect(scopes).not.toContain(GOOGLE_SCOPES.driveFull);
    });

    it('does not contain undefined in the scope list', async () => {
      const provider = makeProvider();
      const scopes = await provider.getSupportedScopes();
      expect(scopes).not.toContain(undefined);
      expect(scopes.every((s) => typeof s === 'string')).toBe(true);
    });
  });

  describe('getAuthorizationUrl()', () => {
    it('generates a URL containing the Google auth domain', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid', 'email'],
        state: 'test-state-value',
      });
      expect(url).toContain('accounts.google.com');
    });

    it('includes the state in the generated URL', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'my-csrf-state',
      });
      expect(url).toContain('my-csrf-state');
    });

    it('includes access_type=offline for refresh token support', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'state',
      });
      expect(url).toContain('access_type=offline');
    });

    it('includes code_challenge when PKCE params are provided', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'state',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: 'S256',
      });
      expect(url).toContain('code_challenge=');
    });

    it('returns the same state that was passed in', async () => {
      const provider = makeProvider();
      const result = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'returned-state',
      });
      expect(result.state).toBe('returned-state');
    });
  });

  describe('exchangeCode()', () => {
    it('returns an OAuthTokenSet with the tokens from Google', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest.spyOn(OAuth2Client.prototype, 'getToken').mockImplementation(async () => ({
        tokens: {
          access_token: 'exchanged-access',
          refresh_token: 'exchanged-refresh',
          expiry_date: Date.now() + 3600_000,
          id_token: 'id-tok',
          token_type: 'Bearer',
        },
      }));

      const result = await provider.exchangeCode({ code: 'auth-code-abc' });

      expect(result.accessToken).toBe('exchanged-access');
      expect(result.refreshToken).toBe('exchanged-refresh');
      expect(result.tokenType).toBe('Bearer');
      expect(result.idToken).toBe('id-tok');

      spy.mockRestore();
    });

    it('throws when Google returns a token set without an access_token', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest.spyOn(OAuth2Client.prototype, 'getToken').mockImplementation(async () => ({
        tokens: {},
      }));

      await expect(provider.exchangeCode({ code: 'bad-code' })).rejects.toThrow(
        'No access token received from Google',
      );

      spy.mockRestore();
    });
  });

  describe('refreshToken()', () => {
    it('does not mutate the shared OAuth2Client singleton during refresh', async () => {
      const provider = makeProvider();
      const singleton = (provider as any).oauthClient;
      const singletonSetCredentialsSpy = jest.spyOn(singleton, 'setCredentials');

      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest
        .spyOn(OAuth2Client.prototype, 'refreshAccessToken')
        .mockImplementation(async () => ({
          credentials: { access_token: 'refreshed-tok', expiry_date: Date.now() + 3600_000 },
        }));

      await provider.refreshToken({ refreshToken: 'old-refresh' });

      expect(singletonSetCredentialsSpy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('returns the new access token from the isolated client', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest
        .spyOn(OAuth2Client.prototype, 'refreshAccessToken')
        .mockImplementation(async () => ({
          credentials: { access_token: 'brand-new-access', expiry_date: Date.now() + 3600_000 },
        }));

      const result = await provider.refreshToken({ refreshToken: 'my-refresh' });
      expect(result.accessToken).toBe('brand-new-access');

      spy.mockRestore();
    });

    it('throws when Google returns no access token during refresh', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest
        .spyOn(OAuth2Client.prototype, 'refreshAccessToken')
        .mockImplementation(async () => ({
          credentials: {},
        }));

      await expect(provider.refreshToken({ refreshToken: 'ref' })).rejects.toThrow(
        'Failed to refresh Google access token',
      );

      spy.mockRestore();
    });
  });

  describe('getUserProfile()', () => {
    it('extracts full profile from a valid ID token via verifyIdToken', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => ({
        getPayload: () => ({
          sub: 'sub-123',
          email: 'alice@gmail.com',
          name: 'Alice Example',
          given_name: 'Alice',
          family_name: 'Example',
          picture: 'https://example.com/alice.png',
          locale: 'en-US',
        }),
      }));

      const profile = await provider.getUserProfile('access-tok', 'some-id-token');

      expect(profile.externalId).toBe('sub-123');
      expect(profile.email).toBe('alice@gmail.com');
      expect(profile.name).toBe('Alice Example');
      expect(profile.givenName).toBe('Alice');
      expect(profile.familyName).toBe('Example');
      expect(profile.pictureUrl).toBe('https://example.com/alice.png');
      expect(profile.locale).toBe('en-US');

      spy.mockRestore();
    });

    it('throws when the ID token payload has no email', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => ({
        getPayload: () => ({}),
      }));

      await expect(provider.getUserProfile('tok', 'bad-id-token')).rejects.toThrow(
        /email/i,
      );

      spy.mockRestore();
    });

    it('throws when no ID token is provided', async () => {
      const provider = makeProvider();
      await expect(provider.getUserProfile('tok')).rejects.toThrow(
        /ID token/i,
      );
    });

    it('does not make additional HTTP calls beyond ID token verification', async () => {
      const provider = makeProvider();
      const { OAuth2Client } = await import('google-auth-library');
      const spy = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => ({
        getPayload: () => ({ email: 'user@gmail.com' }),
      }));

      await provider.getUserProfile('tok', 'id-tok');

      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  describe('getAuthenticatedClient()', () => {
    it('returns a scoped OAuth2Client different from the module singleton', async () => {
      const provider = makeProvider();
      const singleton = (provider as any).oauthClient;

      const client = await provider.getAuthenticatedClient('my-access-token');

      expect(client).not.toBe(singleton);
    });

    it('sets the access_token on the returned client', async () => {
      const provider = makeProvider();
      const client = await provider.getAuthenticatedClient('my-access-token');
      expect(client.credentials.access_token).toBe('my-access-token');
    });
  });
});
