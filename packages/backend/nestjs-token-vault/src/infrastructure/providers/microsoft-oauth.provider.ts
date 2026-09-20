import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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
import { MICROSOFT_SCOPES } from '../../scopes';

/** Raw response shape returned by Microsoft's token endpoint. */
export interface MicrosoftTokenSetRaw {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
}

/** Thin authenticated-client object returned by `getAuthenticatedClient()`. */
export interface MicrosoftAuthenticatedClient {
  accessToken: string;
  get(url: string): Promise<any>;
}

/**
 * Microsoft OAuth provider implementing `IOAuthProvider`.
 *
 * Uses raw HTTP calls to Microsoft identity endpoints (no official SDK).
 * Profile is sourced from the Graph `/me` endpoint (more reliable than the
 * ID token for display name, given name, surname).
 */
@Injectable()
export class MicrosoftOAuthProvider implements IOAuthProvider {
  readonly providerKey = 'microsoft';
  readonly isConfigured: boolean;

  private readonly logger = new Logger(MicrosoftOAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly callbackUrl: string;

  private readonly oidcDefaults = ['openid', 'profile', 'email', 'offline_access'];

  constructor(
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    private readonly httpService: HttpService,
  ) {
    const cfg = options.microsoftOAuth;
    this.isConfigured = !!(cfg?.clientId && cfg?.clientSecret && cfg?.tenantId && cfg?.callbackUrl);

    if (this.isConfigured) {
      this.clientId = cfg!.clientId;
      this.clientSecret = cfg!.clientSecret;
      this.tenantId = cfg!.tenantId;
      this.callbackUrl = cfg!.callbackUrl;
    } else {
      this.logger.warn('Microsoft OAuth is not configured. Routes under /auth/oauth/microsoft/* will return 501.');
    }
  }

  private get tokenEndpoint(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth/v2.0/token`;
  }

  private get authorizeEndpoint(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/oauth/v2.0/authorize`;
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error(
        '[TokenVaultModule] Microsoft OAuth is not configured. ' +
          'Set microsoftOAuth.clientId, clientSecret, tenantId, and callbackUrl in TokenVaultModule options.',
      );
    }
  }

  async getSupportedScopes(): Promise<string[]> {
    const configured = this.options.microsoftOAuth?.allowedScopes;
    const extra = configured?.length ? configured : [MICROSOFT_SCOPES.userRead];
    return [...new Set([...this.oidcDefaults, ...extra])];
  }

  async getAuthorizationUrl(params: AuthorizationParams): Promise<AuthorizationResult> {
    this.ensureConfigured();
    const allScopes = [...new Set([...this.oidcDefaults, ...params.scopes])];
    const urlParams = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.callbackUrl,
      scope: allScopes.join(' '),
      state: params.state,
      response_mode: 'query',
      prompt: 'consent',
    });
    if (params.codeChallenge) {
      urlParams.set('code_challenge', params.codeChallenge);
      urlParams.set('code_challenge_method', 'S256');
    }
    return { url: `${this.authorizeEndpoint}?${urlParams.toString()}`, state: params.state };
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet> {
    this.ensureConfigured();
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: params.code,
      redirect_uri: this.callbackUrl,
      grant_type: 'authorization_code',
    });
    if (params.codeVerifier) body.set('code_verifier', params.codeVerifier);

    const { data } = await firstValueFrom(
      this.httpService.post<MicrosoftTokenSetRaw>(
        this.tokenEndpoint,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    if (!data.access_token) throw new Error('No access token received from Microsoft');
    return this.toOAuthTokenSet(data);
  }

  async refreshToken(params: RefreshParams): Promise<OAuthTokenSet> {
    this.ensureConfigured();
    // Use the token's stored scope rather than all supported scopes to avoid
    // requesting permissions the user never consented to.
    const scopeToRequest = params.scope ?? this.oidcDefaults.join(' ');
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
      scope: scopeToRequest,
    });

    const { data } = await firstValueFrom(
      this.httpService.post<MicrosoftTokenSetRaw>(
        this.tokenEndpoint,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    if (!data.access_token) throw new Error('Failed to refresh Microsoft access token');
    return this.toOAuthTokenSet(data);
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          'https://graph.microsoft.com/v1.0/me/revokeSignInSessions',
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );
      this.logger.log('Microsoft sign-in sessions revoked via Graph API');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(
        `Best-effort Microsoft token revocation failed: ${message}. Local token will still be removed.`,
      );
    }
  }

  async getUserProfile(accessToken: string, idToken?: string): Promise<OAuthUserProfile> {
    const idClaims = idToken ? this.decodeIdToken(idToken) : undefined;

    const { data } = await firstValueFrom(
      this.httpService.get<{
        id?: string;
        displayName?: string;
        givenName?: string;
        surname?: string;
        mail?: string;
        userPrincipalName?: string;
        preferredLanguage?: string;
      }>(
        'https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,mail,userPrincipalName,preferredLanguage',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );

    const email =
      idClaims?.preferred_username ??
      idClaims?.email ??
      data.mail ??
      data.userPrincipalName;

    if (!email) throw new Error('Could not retrieve email from Microsoft user profile');

    return {
      externalId: data.id ?? idClaims?.oid ?? idClaims?.sub,
      email,
      name: data.displayName ?? idClaims?.name,
      givenName: data.givenName ?? idClaims?.given_name,
      familyName: data.surname ?? idClaims?.family_name,
      locale: data.preferredLanguage,
    };
  }

  /** Returns a thin authenticated client carrying the access token. */
  async getAuthenticatedClient(accessToken: string): Promise<MicrosoftAuthenticatedClient> {
    this.ensureConfigured();
    return {
      accessToken,
      get: (url: string) =>
        firstValueFrom(
          this.httpService.get(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ).then((r) => r.data),
    };
  }

  private toOAuthTokenSet(raw: MicrosoftTokenSetRaw): OAuthTokenSet {
    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      expiresAt: new Date(Date.now() + raw.expires_in * 1000),
      tokenType: raw.token_type ?? 'Bearer',
      scope: raw.scope,
      idToken: raw.id_token,
    };
  }

  private decodeIdToken(idToken: string): Record<string, any> | undefined {
    try {
      return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf-8'));
    } catch {
      return undefined;
    }
  }
}
