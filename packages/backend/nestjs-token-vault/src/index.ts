// ── Module ────────────────────────────────────────────────────────────────────
export {
  TokenVaultModule,
  TokenVaultAsyncOptions,
  TokenVaultModuleOptions,
} from './token-vault.module';

// ── Configuration ─────────────────────────────────────────────────────────────
export { TOKEN_VAULT_OPTIONS } from './token-vault-options';
export { TokenVaultOptionsSchema } from './token-vault.schema';

// ── Primary Consumer API ──────────────────────────────────────────────────────
export { TokenVaultFacade, TOKEN_VAULT_FACADE } from './application/services/token-vault.facade';

// ── Provider Registry ─────────────────────────────────────────────────────────
export { OAUTH_PROVIDER_REGISTRY } from './application/ports/oauth-provider.port';
export type {
  IOAuthProvider,
  OAuthTokenSet,
  AuthorizationParams,
  AuthorizationResult,
  ExchangeCodeParams,
  RefreshParams,
} from './application/ports/oauth-provider.port';

// ── Domain filter types (for repository consumers) ────────────────────────────
export { OAuthAccount } from './domain/aggregates/oauth-account/oauth-account.aggregate';
export { OAuthToken } from './domain/aggregates/oauth-token/oauth-token.aggregate';
export type { OAuthAccountFilter } from './domain/aggregates/oauth-account/oauth-account.aggregate';
export type { OAuthTokenFilter, OAuthAccountSnapshot } from './domain/aggregates/oauth-token/oauth-token.aggregate';

// ── Domain Value Objects ──────────────────────────────────────────────────────
export { EncryptedToken } from './domain/value-objects/encrypted-token.vo';
export { TokenScope } from './domain/value-objects/token-scope.vo';

// ── Domain Repositories — **host persistence only** (`apps/*/shared/persistence`) ──
// Cross-module token/OAuth access: TokenVaultFacade only.
export { IOAuthAccountRepository } from './domain/repositories/oauth-account.repository';
export type { IOAuthAccountRepository as IOAuthAccountRepositoryInterface } from './domain/repositories/oauth-account.repository';
export { IOAuthTokenRepository } from './domain/repositories/oauth-token.repository';
export type { IOAuthTokenRepository as IOAuthTokenRepositoryInterface } from './domain/repositories/oauth-token.repository';

// ── Domain Errors ─────────────────────────────────────────────────────────────
export {
  ProviderNotConfiguredError,
  InvalidCallbackStateError,
  TokenNotFoundError,
  TokenExpiredError,
  NoRefreshTokenError,
  InvalidScopeError,
  InvalidEncryptedTokenError,
  DuplicateAuthorizationCodeError,
  AmbiguousTokenSelectionError,
  OAuthCallbackError,
} from './domain/errors/token-vault.errors';

// ── Domain Events ─────────────────────────────────────────────────────────────
export { AccountConnectedEvent } from './domain/events/account-connected.event';
export { AccountDisconnectedEvent } from './domain/events/account-disconnected.event';
export { TokenRefreshedEvent } from './domain/events/token-refreshed.event';
export { TokenRevokedEvent } from './domain/events/token-revoked.event';

// ── Application DTOs ─────────────────────────────────────────────────────────
export {
  OAuthAccountDto,
  OAuthTokenDto,
  AuthUrlResponseDto,
  AuthCallbackDto,
} from './application/dto/oauth-token.dto';
export { OAuthCallbackResultDto } from './application/dto/oauth-callback-result.dto';

// ── Scopes ────────────────────────────────────────────────────────────────────
export { GOOGLE_SCOPES, MICROSOFT_SCOPES } from './scopes';
export type { GoogleScope, MicrosoftScope } from './scopes';
