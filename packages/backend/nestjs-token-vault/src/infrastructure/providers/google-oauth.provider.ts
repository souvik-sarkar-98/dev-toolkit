import { Inject, Injectable, Logger } from '@nestjs/common';
import { Credentials, OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { AppTechnicalError } from '@ssdev-toolkit/nestjs-core';
import { EventBus } from '@nestjs/cqrs';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../token-vault-options';
import type {
  AuthorizationParams,
  AuthorizationResult,
  ExchangeCodeParams,
  IOAuthProvider,
  OAuthTokenSet,
  RefreshParams,
} from '../../application/ports/oauth-provider.port';
import type { OAuthUserProfile } from '../../domain/aggregates/oauth-account/oauth-account.aggregate';
import { GOOGLE_SCOPES } from '../../scopes';

/**
 * Google OAuth provider implementing `IOAuthProvider`.
 *
 * Uses `google-auth-library` `OAuth2Client` internally. PKCE (S256) is always
 * used for authorization code exchange. The ID token is verified via the library
 * (no extra network call needed for the profile).
 */
@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider {
  readonly providerKey = 'google';
  readonly isConfigured: boolean;

  private readonly logger = new Logger(GoogleOAuthProvider.name);
  private readonly oauthClient: OAuth2Client | undefined;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly oidcDefaults = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
    'email',
    'profile',
  ];

  constructor(
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    private readonly eventBus: EventBus,
  ) {
    const cfg = options.googleOAuth;
    this.isConfigured = !!(cfg?.clientId && cfg?.clientSecret);

    if (this.isConfigured) {
      this.clientId = cfg!.clientId;
      this.clientSecret = cfg!.clientSecret;
      this.redirectUri = cfg!.callbackUrl;
      this.oauthClient = new OAuth2Client({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectUri,
      });
    } else {
      this.logger.warn('Google OAuth is not configured. Routes under /auth/oauth/google/* will return 501.');
    }
  }

  private get client(): OAuth2Client {
    if (!this.oauthClient) {
      throw new Error(
        '[TokenVaultModule] Google OAuth is not configured. ' +
        'Set googleOAuth.clientId, clientSecret, and callbackUrl in TokenVaultModule options.',
      );
    }
    return this.oauthClient;
  }

  async getSupportedScopes(): Promise<string[]> {
    const configured = this.options.googleOAuth?.allowedScopes;
    const extra = configured?.length
      ? configured
      : [GOOGLE_SCOPES.gmailFull, GOOGLE_SCOPES.calendar, GOOGLE_SCOPES.driveFull];
    return [...new Set([...this.oidcDefaults, ...extra])];
  }

  async getAuthorizationUrl(params: AuthorizationParams): Promise<AuthorizationResult> {
    const allScopes = [...new Set([...this.oidcDefaults, ...params.scopes])];
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: allScopes,
      prompt: 'consent',
      state: params.state,
      response_type: 'code',
      include_granted_scopes: true,
      ...(params.codeChallenge
        ? {
          code_challenge: params.codeChallenge,
          code_challenge_method: CodeChallengeMethod.S256,
        }
        : {}),
    });
    return { url, state: params.state };
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    const { tokens } = await this.client.getToken({
      code: params.code,
      codeVerifier: params.codeVerifier,
    });
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }
    return this.toOAuthTokenSet(tokens);
  }

  async refreshToken(params: RefreshParams): Promise<OAuthTokenSet> {
    const isolated = new OAuth2Client({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      redirectUri: this.redirectUri,
    });
    isolated.setCredentials({ refresh_token: params.refreshToken });
    const { credentials } = await isolated.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('Failed to refresh Google access token');
    }
    return this.toOAuthTokenSet(credentials);
  }

  async revokeToken(accessToken: string): Promise<void> {
    await this.client.revokeToken(accessToken);
  }

  async getUserProfile(accessToken: string, idToken?: string): Promise<OAuthUserProfile> {
    if (!idToken) {
      throw new Error('Google getUserProfile requires an ID token');
    }
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new Error('Could not retrieve email from Google ID token');
    }
    return {
      externalId: payload.sub,
      email: payload.email,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      pictureUrl: payload.picture,
      locale: payload.locale,
    };
  }

  /**
   * Returns an `OAuth2Client` scoped to the given plaintext access token.
   *
   * Consumers obtain the access token via `TokenVaultFacade.getAccessToken()`,
   * then pass it here to get a typed Google API client.
   *
   * Returns a per-request scoped client — never mutates the shared singleton.
   */
  async getAuthenticatedClient(accessToken: string): Promise<OAuth2Client> {
    try {
      const scoped = new OAuth2Client({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectUri,
      });
      scoped.setCredentials({ access_token: accessToken });
      return scoped;
    } catch (error) {
      this.eventBus.publish(
        new AppTechnicalError(error instanceof Error ? error : new Error(String(error))),
      );
      throw error;
    }
  }

  private toOAuthTokenSet(tokens: Credentials): OAuthTokenSet {
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      tokenType: tokens.token_type ?? 'Bearer',
      scope: tokens.scope ?? undefined,
      idToken: tokens.id_token ?? undefined,
    };
  }
}
