import { OAuthUserProfile } from '../../domain/aggregates/oauth-account/oauth-account.aggregate';

/**
 * Raw token set returned by any OAuth provider after a successful
 * authorization-code exchange or refresh.
 *
 * All values are plaintext — the application layer encrypts them before
 * passing to the aggregate.
 */
export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  idToken?: string;
}

export interface AuthorizationParams {
  scopes: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256';
}

export interface AuthorizationResult {
  url: string;
  state: string;
}

export interface ExchangeCodeParams {
  code: string;
  codeVerifier?: string;
  redirectUri?: string;
}

export interface RefreshParams {
  refreshToken: string;
  /** Stored scope for the token being refreshed. Providers should request only
   *  these scopes rather than all configured scopes for the installation. */
  scope?: string;
}

/**
 * Application-level port — the key abstraction separating OAuth protocol
 * details from business orchestration.
 *
 * Infrastructure providers (Google, Microsoft) implement this interface.
 * Command handlers inject the correct provider via `OAUTH_PROVIDER_REGISTRY`.
 *
 * Adding a new provider = implement this interface + register in the module.
 * Zero changes required in any handler, query, or consumer.
 */
export const IOAuthProvider = Symbol('IOAuthProvider');

export interface IOAuthProvider {
  /** Unique key identifying this provider — e.g. 'google', 'microsoft'. */
  readonly providerKey: string;

  /** Whether this provider has been fully configured (credentials present). */
  readonly isConfigured: boolean;

  /** Returns the full list of scopes this provider allows for this installation. */
  getSupportedScopes(): Promise<string[]>;

  /**
   * Builds the authorization URL to redirect the user to.
   * Always includes PKCE (S256) challenge when `codeChallenge` is provided.
   */
  getAuthorizationUrl(params: AuthorizationParams): Promise<AuthorizationResult>;

  /** Exchanges an authorization code for tokens. Validates and discards the code after use. */
  exchangeCode(params: ExchangeCodeParams): Promise<OAuthTokenSet>;

  /** Refreshes an access token using the stored refresh token. */
  refreshToken(params: RefreshParams): Promise<OAuthTokenSet>;

  /** Revokes the access token at the provider. Best-effort — failure should be logged, not thrown. */
  revokeToken(accessToken: string): Promise<void>;

  /** Fetches the authenticated user's profile from the provider. */
  getUserProfile(accessToken: string, idToken?: string): Promise<OAuthUserProfile>;

  /**
   * Returns a provider-specific authenticated client configured with the given access token.
   * The return type is `unknown` here — providers cast to their specific client type in their class.
   * Consumers that need the typed client (e.g. OAuth2Client) inject the concrete provider class.
   */
  getAuthenticatedClient(accessToken: string): Promise<unknown>;
}

/**
 * Injection token for the runtime map of configured OAuth providers.
 * Map<providerKey, IOAuthProvider>
 */
export const OAUTH_PROVIDER_REGISTRY = Symbol('OAUTH_PROVIDER_REGISTRY');
