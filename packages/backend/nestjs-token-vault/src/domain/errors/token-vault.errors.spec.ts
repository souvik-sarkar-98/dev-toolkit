import {
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
} from '@ssdev-toolkit/nestjs-token-vault/domain/errors/token-vault.errors';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';

describe('Token-vault2 domain errors', () => {
  describe('ProviderNotConfiguredError', () => {
    it('is a BusinessError', () => {
      expect(new ProviderNotConfiguredError('google')).toBeInstanceOf(BusinessError);
    });

    it('returns status 501', () => {
      const error = new ProviderNotConfiguredError('google');
      expect(error.statusCode).toBe(501);
    });

    it('includes provider name in the message', () => {
      const error = new ProviderNotConfiguredError('github');
      expect(error.message).toContain('github');
    });

    it('has OAUTH_PROVIDER_NOT_CONFIGURED errorCode', () => {
      const error = new ProviderNotConfiguredError('google');
      expect(error.errorCode).toBe('OAUTH_PROVIDER_NOT_CONFIGURED');
    });
  });

  describe('InvalidCallbackStateError', () => {
    it('is a BusinessError with status 400', () => {
      const error = new InvalidCallbackStateError();
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(400);
    });

    it('has OAUTH_INVALID_STATE errorCode', () => {
      expect(new InvalidCallbackStateError().errorCode).toBe('OAUTH_INVALID_STATE');
    });
  });

  describe('TokenNotFoundError', () => {
    it('is a BusinessError with status 404', () => {
      const error = new TokenNotFoundError();
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(404);
    });

    it('includes an optional hint in the message', () => {
      const error = new TokenNotFoundError('provider=google');
      expect(error.message).toContain('provider=google');
    });

    it('has OAUTH_TOKEN_NOT_FOUND errorCode', () => {
      expect(new TokenNotFoundError().errorCode).toBe('OAUTH_TOKEN_NOT_FOUND');
    });
  });

  describe('TokenExpiredError', () => {
    it('is a BusinessError with status 401', () => {
      const error = new TokenExpiredError('token-123');
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(401);
    });

    it('includes the token id in the message', () => {
      const error = new TokenExpiredError('token-xyz');
      expect(error.message).toContain('token-xyz');
    });

    it('has OAUTH_TOKEN_EXPIRED errorCode', () => {
      expect(new TokenExpiredError('id').errorCode).toBe('OAUTH_TOKEN_EXPIRED');
    });
  });

  describe('NoRefreshTokenError', () => {
    it('is a BusinessError with status 401', () => {
      const error = new NoRefreshTokenError('token-abc');
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(401);
    });

    it('includes the token id in the message', () => {
      const error = new NoRefreshTokenError('token-abc');
      expect(error.message).toContain('token-abc');
    });

    it('has OAUTH_NO_REFRESH_TOKEN errorCode', () => {
      expect(new NoRefreshTokenError('id').errorCode).toBe('OAUTH_NO_REFRESH_TOKEN');
    });
  });

  describe('InvalidScopeError', () => {
    it('is a BusinessError with status 403', () => {
      const error = new InvalidScopeError(['bad.scope'], 'google');
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(403);
    });

    it('includes invalid scopes in the message', () => {
      const error = new InvalidScopeError(['bad.scope', 'another.bad'], 'google');
      expect(error.message).toContain('bad.scope');
      expect(error.message).toContain('another.bad');
    });

    it('has OAUTH_INVALID_SCOPE errorCode', () => {
      expect(new InvalidScopeError([], 'google').errorCode).toBe('OAUTH_INVALID_SCOPE');
    });
  });

  describe('InvalidEncryptedTokenError', () => {
    it('is a BusinessError with status 500', () => {
      const error = new InvalidEncryptedTokenError();
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(500);
    });

    it('has OAUTH_INVALID_ENCRYPTED_TOKEN errorCode', () => {
      expect(new InvalidEncryptedTokenError().errorCode).toBe('OAUTH_INVALID_ENCRYPTED_TOKEN');
    });
  });

  describe('DuplicateAuthorizationCodeError', () => {
    it('is a BusinessError with status 400', () => {
      const error = new DuplicateAuthorizationCodeError();
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(400);
    });

    it('has OAUTH_DUPLICATE_AUTH_CODE errorCode', () => {
      expect(new DuplicateAuthorizationCodeError().errorCode).toBe('OAUTH_DUPLICATE_AUTH_CODE');
    });
  });

  describe('AmbiguousTokenSelectionError', () => {
    it('is a BusinessError with status 409', () => {
      const error = new AmbiguousTokenSelectionError('google', 3);
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(409);
    });

    it('includes provider name and count in the message', () => {
      const error = new AmbiguousTokenSelectionError('microsoft', 5);
      expect(error.message).toContain('microsoft');
      expect(error.message).toContain('5');
    });

    it('has OAUTH_AMBIGUOUS_TOKEN_SELECTION errorCode', () => {
      expect(new AmbiguousTokenSelectionError('google', 2).errorCode).toBe(
        'OAUTH_AMBIGUOUS_TOKEN_SELECTION',
      );
    });
  });

  describe('OAuthCallbackError', () => {
    it('is a BusinessError with status 400', () => {
      const error = new OAuthCallbackError('access_denied');
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.statusCode).toBe(400);
    });

    it('includes the reason in the message', () => {
      const error = new OAuthCallbackError('invalid_client');
      expect(error.message).toContain('invalid_client');
    });

    it('has OAUTH_CALLBACK_ERROR errorCode', () => {
      expect(new OAuthCallbackError('reason').errorCode).toBe('OAUTH_CALLBACK_ERROR');
    });
  });
});
