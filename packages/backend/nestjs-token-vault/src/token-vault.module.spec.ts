jest.mock('@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/google-oauth.provider', () => ({
  GoogleOAuthProvider: class GoogleOAuthProvider { },
}));
jest.mock('@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/microsoft-oauth.provider', () => ({
  MicrosoftOAuthProvider: class MicrosoftOAuthProvider { },
}));
jest.mock('@ssdev-toolkit/nestjs-token-vault/presentation/controllers/oauth.controller', () => ({
  OAuthController: class OAuthController { },
}));

import { TokenVaultModule } from '@ssdev-toolkit/nestjs-token-vault/token-vault.module';
import { OAUTH_PROVIDER_REGISTRY } from '@ssdev-toolkit/nestjs-token-vault/application/ports/oauth-provider.port';
import { TOKEN_VAULT_OPTIONS } from '@ssdev-toolkit/nestjs-token-vault/token-vault-options';
import { GoogleOAuthProvider } from '@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/google-oauth.provider';
import { MicrosoftOAuthProvider } from '@ssdev-toolkit/nestjs-token-vault/infrastructure/providers/microsoft-oauth.provider';

const validOptions = {
  encryption: {
    secret: 'a'.repeat(32),
  },
};

describe('TokenVaultModule', () => {
  describe('forRoot()', () => {
    it('provides validated token vault options', () => {
      const mod = TokenVaultModule.forRoot(validOptions);
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === TOKEN_VAULT_OPTIONS,
      );

      expect(provider.useValue).toEqual(validOptions);
    });

    it('throws when encryption secret is too short', () => {
      expect(() =>
        TokenVaultModule.forRoot({
          encryption: { secret: 'short' },
        } as any),
      ).toThrow('[TokenVaultModule] Config validation failed:');
    });
  });

  describe('forRootAsync()', () => {
    it('validates async factory output', async () => {
      const mod = TokenVaultModule.forRootAsync({
        useFactory: () => validOptions,
      });
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === TOKEN_VAULT_OPTIONS,
      );

      await expect(provider.useFactory()).resolves.toEqual(validOptions);
    });

    it('throws when async factory returns invalid options', async () => {
      const mod = TokenVaultModule.forRootAsync({
        useFactory: () => ({
          encryption: { secret: 'short' },
        } as any),
      });
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === TOKEN_VAULT_OPTIONS,
      );

      await expect(provider.useFactory()).rejects.toThrow(
        '[TokenVaultModule] Config validation failed:',
      );
    });
  });

  describe('service map provider', () => {
    it('returns an empty map when no OAuth providers are configured', () => {
      const mod = TokenVaultModule.forRoot(validOptions);
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OAUTH_PROVIDER_REGISTRY,
      );

      expect(
        provider.useFactory(validOptions, 'google-service', 'microsoft-service'),
      ).toEqual(new Map());
    });

    it('maps configured OAuth providers to their services', () => {
      const options = {
        ...validOptions,
        googleOAuth: {
          clientId: 'google-client',
          clientSecret: 'google-secret',
          callbackUrl: 'https://example.com/google/callback',
        },
        microsoftOAuth: {
          clientId: 'microsoft-client',
          clientSecret: 'microsoft-secret',
          tenantId: 'common',
          callbackUrl: 'https://example.com/microsoft/callback',
        },
      };
      const mod = TokenVaultModule.forRoot(options);
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OAUTH_PROVIDER_REGISTRY,
      );
      const googleService = {} as GoogleOAuthProvider;
      const microsoftService = {} as MicrosoftOAuthProvider;
      const expected = new Map<string, unknown>([
        ['google', googleService],
        ['microsoft', microsoftService],
      ]);

      expect(provider.useFactory(options, googleService, microsoftService)).toEqual(expected);
    });
  });
});
