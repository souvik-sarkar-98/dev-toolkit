// axios is not installed in this repo; mock the module so that HttpService is importable.
jest.mock('@nestjs/axios', () => ({
  HttpService: class HttpService { },
}));

import { MicrosoftOAuthProvider } from '@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/microsoft-oauth.provider';
import { MICROSOFT_SCOPES } from '@ssdev-toolkit/nestjs-token-vault/scopes';
import { of, throwError } from 'rxjs';

const ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-32chars';

const makeOptions = (overrides?: object) => ({
  encryption: { secret: ENCRYPTION_KEY },
  microsoftOAuth: {
    clientId: 'ms-client-id',
    clientSecret: 'ms-client-secret',
    tenantId: 'common',
    callbackUrl: 'https://example.com/auth/oauth/microsoft/callback',
  },
  ...overrides,
});

function makeHttpService(responseData?: any, error?: Error) {
  const postFn = error
    ? jest.fn().mockReturnValue(throwError(() => error))
    : jest.fn().mockReturnValue(of({ data: responseData ?? {} }));

  const getFn = error
    ? jest.fn().mockReturnValue(throwError(() => error))
    : jest.fn().mockReturnValue(of({ data: responseData ?? {} }));

  return { post: postFn, get: getFn };
}

function makeProvider(optionOverrides?: object, httpData?: any, httpError?: Error): MicrosoftOAuthProvider {
  return new MicrosoftOAuthProvider(
    makeOptions(optionOverrides) as any,
    makeHttpService(httpData, httpError) as any,
  );
}

describe('MicrosoftOAuthProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('isConfigured', () => {
    it('is true when all required credentials are present', () => {
      expect(makeProvider().isConfigured).toBe(true);
    });

    it('is false when microsoftOAuth block is absent', () => {
      const provider = new MicrosoftOAuthProvider(
        { encryption: { secret: ENCRYPTION_KEY } } as any,
        makeHttpService() as any,
      );
      expect(provider.isConfigured).toBe(false);
    });

    it('has providerKey = "microsoft"', () => {
      expect(makeProvider().providerKey).toBe('microsoft');
    });
  });

  describe('getSupportedScopes()', () => {
    it('includes OIDC defaults always', async () => {
      const provider = makeProvider();
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain('openid');
      expect(scopes).toContain('email');
      expect(scopes).toContain('profile');
      expect(scopes).toContain('offline_access');
    });

    it('falls back to User.Read when allowedScopes is not configured', async () => {
      const provider = makeProvider();
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain(MICROSOFT_SCOPES.userRead);
    });

    it('uses allowedScopes when configured', async () => {
      const provider = makeProvider({
        microsoftOAuth: {
          clientId: 'id',
          clientSecret: 'secret',
          tenantId: 'common',
          callbackUrl: 'https://cb',
          allowedScopes: [MICROSOFT_SCOPES.mailSend],
        },
      });
      const scopes = await provider.getSupportedScopes();
      expect(scopes).toContain(MICROSOFT_SCOPES.mailSend);
      expect(scopes).not.toContain(MICROSOFT_SCOPES.userRead);
    });
  });

  describe('getAuthorizationUrl()', () => {
    it('generates a URL containing the Microsoft identity endpoint', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid', 'email'],
        state: 'test-state',
      });
      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('common');
      expect(url).toContain('oauth/v2.0/authorize');
    });

    it('includes the state parameter in the URL', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'my-csrf-state',
      });
      expect(url).toContain('my-csrf-state');
    });

    it('includes code_challenge when PKCE params are provided', async () => {
      const provider = makeProvider();
      const { url } = await provider.getAuthorizationUrl({
        scopes: ['openid'],
        state: 'state',
        codeChallenge: 'challenge-value',
        codeChallengeMethod: 'S256',
      });
      expect(url).toContain('code_challenge=challenge-value');
      expect(url).toContain('code_challenge_method=S256');
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
    it('returns an OAuthTokenSet from the Microsoft token endpoint response', async () => {
      const tokenResponse = {
        access_token: 'ms-access-token',
        refresh_token: 'ms-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email',
        id_token: 'ms-id-token',
      };

      const httpService = makeHttpService(tokenResponse);
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const result = await provider.exchangeCode({ code: 'auth-code', codeVerifier: 'verifier' });

      expect(result.accessToken).toBe('ms-access-token');
      expect(result.refreshToken).toBe('ms-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.idToken).toBe('ms-id-token');
      expect(httpService.post).toHaveBeenCalled();
    });

    it('throws when Microsoft returns a response without access_token', async () => {
      const httpService = makeHttpService({ expires_in: 3600, token_type: 'Bearer', scope: '' });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      await expect(provider.exchangeCode({ code: 'bad-code' })).rejects.toThrow(
        'No access token received from Microsoft',
      );
    });

    it('sends the code verifier when provided', async () => {
      const tokenResponse = {
        access_token: 'access',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid',
      };
      const httpService = makeHttpService(tokenResponse);
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      await provider.exchangeCode({ code: 'code', codeVerifier: 'my-verifier' });

      const callArg = httpService.post.mock.calls[0][1] as string;
      expect(callArg).toContain('code_verifier=my-verifier');
    });
  });

  describe('refreshToken()', () => {
    it('returns a new OAuthTokenSet from the token refresh endpoint', async () => {
      const tokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'openid email',
      };

      const httpService = makeHttpService(tokenResponse);
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const result = await provider.refreshToken({ refreshToken: 'old-refresh' });

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('throws when Microsoft returns no access_token on refresh', async () => {
      const httpService = makeHttpService({ expires_in: 3600, token_type: 'Bearer', scope: '' });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      await expect(provider.refreshToken({ refreshToken: 'ref' })).rejects.toThrow(
        'Failed to refresh Microsoft access token',
      );
    });
  });

  describe('revokeToken()', () => {
    it('completes without error (Microsoft has no standard revocation endpoint)', async () => {
      const provider = makeProvider();
      await expect(provider.revokeToken('some-access-token')).resolves.toBeUndefined();
    });
  });

  describe('getUserProfile()', () => {
    it('returns profile data from Graph /me endpoint', async () => {
      const graphResponse = {
        id: 'ms-user-id',
        displayName: 'Bob Smith',
        givenName: 'Bob',
        surname: 'Smith',
        mail: 'bob@example.com',
        preferredLanguage: 'en-US',
      };

      const httpService = makeHttpService(graphResponse);
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const profile = await provider.getUserProfile('access-tok');

      expect(profile.externalId).toBe('ms-user-id');
      expect(profile.name).toBe('Bob Smith');
      expect(profile.givenName).toBe('Bob');
      expect(profile.familyName).toBe('Smith');
      expect(profile.email).toBe('bob@example.com');
      expect(profile.locale).toBe('en-US');
    });

    it('uses userPrincipalName as email when mail is absent', async () => {
      const httpService = makeHttpService({
        id: 'oid',
        displayName: 'Carol',
        userPrincipalName: 'carol@tenant.onmicrosoft.com',
      });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const profile = await provider.getUserProfile('tok');
      expect(profile.email).toBe('carol@tenant.onmicrosoft.com');
    });

    it('throws when no email can be resolved', async () => {
      const httpService = makeHttpService({ id: 'oid', displayName: 'NoEmail' });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      await expect(provider.getUserProfile('tok')).rejects.toThrow(/email/i);
    });

    it('prefers ID token claims for email over Graph /me when both are present', async () => {
      // ID token: preferred_username = idtoken@example.com
      const idTokenPayload = { preferred_username: 'idtoken@example.com', oid: 'oid-1' };
      const idTokenB64 = Buffer.from(JSON.stringify(idTokenPayload)).toString('base64url');
      const idToken = `header.${idTokenB64}.signature`;

      const httpService = makeHttpService({
        id: 'graph-id',
        mail: 'graph@example.com',
        displayName: 'User',
      });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const profile = await provider.getUserProfile('tok', idToken);
      expect(profile.email).toBe('idtoken@example.com');
    });
  });

  describe('getAuthenticatedClient()', () => {
    it('returns a client carrying the access token', async () => {
      const provider = makeProvider();
      const client = await provider.getAuthenticatedClient('my-ms-access-token');
      expect(client.accessToken).toBe('my-ms-access-token');
    });

    it('client.get() calls Graph API with Authorization header', async () => {
      const httpService = makeHttpService({ value: [] });
      const provider = new MicrosoftOAuthProvider(makeOptions() as any, httpService as any);

      const client = await provider.getAuthenticatedClient('bearer-token');
      await client.get('https://graph.microsoft.com/v1.0/me/messages');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/messages',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer bearer-token' }),
        }),
      );
    });
  });
});
