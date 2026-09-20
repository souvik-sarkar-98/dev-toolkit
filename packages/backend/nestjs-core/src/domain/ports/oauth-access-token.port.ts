export const OAUTH_ACCESS_TOKEN_PORT = Symbol('IOAuthAccessTokenPort');

export interface OAuthAccessTokenRequest {
  provider: string;
  scope: string;
  ownerSub?: string;
}

/**
 * Generic OAuth access-token port for modules that need delegated account access
 * (e.g. DMS Google Drive, Correspondence Gmail) without depending on TokenVault.
 *
 * Host binds via IntegrationsModule (e.g. TokenVaultOAuthAccessTokenAdapter).
 */
export interface IOAuthAccessTokenPort {
  getAccessToken(request: OAuthAccessTokenRequest): Promise<string>;
}
