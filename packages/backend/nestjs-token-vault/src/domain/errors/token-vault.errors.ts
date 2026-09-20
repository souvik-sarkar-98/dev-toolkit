import { BusinessError } from '@ssdev-toolkit/nestjs-core';

export class ProviderNotConfiguredError extends BusinessError {
  constructor(provider: string) {
    super(
      `OAuth provider "${provider}" is not configured. Enable it by supplying the required credentials in TokenVaultModule options.`,
      'OAUTH_PROVIDER_NOT_CONFIGURED',
      501,
    );
  }
}

export class InvalidCallbackStateError extends BusinessError {
  constructor() {
    super(
      'Invalid or expired OAuth state parameter. Please restart the authorization flow.',
      'OAUTH_INVALID_STATE',
      400,
    );
  }
}

export class TokenNotFoundError extends BusinessError {
  constructor(hint?: string) {
    super(
      hint ? `OAuth token not found: ${hint}.` : 'OAuth token not found.',
      'OAUTH_TOKEN_NOT_FOUND',
      404,
    );
  }
}

export class TokenExpiredError extends BusinessError {
  constructor(tokenId: string) {
    super(
      `OAuth token "${tokenId}" has expired and could not be refreshed. Re-authentication is required.`,
      'OAUTH_TOKEN_EXPIRED',
      401,
    );
  }
}

export class NoRefreshTokenError extends BusinessError {
  constructor(tokenId: string) {
    super(
      `OAuth token "${tokenId}" has no refresh token. Re-authentication is required.`,
      'OAUTH_NO_REFRESH_TOKEN',
      401,
    );
  }
}

export class InvalidScopeError extends BusinessError {
  constructor(invalidScopes: string[], provider: string) {
    super(
      `Invalid scopes requested for ${provider}: [${invalidScopes.join(', ')}]. Only whitelisted scopes are permitted.`,
      'OAUTH_INVALID_SCOPE',
      403,
    );
  }
}

export class InvalidEncryptedTokenError extends BusinessError {
  constructor() {
    super(
      'Token storage integrity check failed: value does not match expected encryption format. Possible data corruption.',
      'OAUTH_INVALID_ENCRYPTED_TOKEN',
      500,
    );
  }
}

export class DuplicateAuthorizationCodeError extends BusinessError {
  constructor() {
    super(
      'Authorization code has already been used. Please restart the OAuth flow.',
      'OAUTH_DUPLICATE_AUTH_CODE',
      400,
    );
  }
}

export class AmbiguousTokenSelectionError extends BusinessError {
  constructor(provider: string, count: number) {
    super(
      `Ambiguous credential selection: ${count} tokens matched for provider "${provider}". Provide "email", "ownerSub", or "tokenId" for deterministic selection.`,
      'OAUTH_AMBIGUOUS_TOKEN_SELECTION',
      409,
    );
  }
}

export class OAuthCallbackError extends BusinessError {
  constructor(reason: string) {
    super(
      `OAuth callback failed: ${reason}`,
      'OAUTH_CALLBACK_ERROR',
      400,
    );
  }
}
