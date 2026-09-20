import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Injectable, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import {
  BaseDynamicModule,
  BaseModuleValidator,
  DynamicModuleAsyncOptions,
  registerModuleValidator,
} from '@ssdev-toolkit/nestjs-core';
import { ILockingPort } from '@ssdev-toolkit/nestjs-persistence';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from './token-vault-options';
import { TokenVaultOptionsSchema } from './token-vault.schema';
import { IOAuthAccountRepository } from './domain/repositories/oauth-account.repository';
import { IOAuthTokenRepository } from './domain/repositories/oauth-token.repository';

// Application handlers
import { InitiateOAuthHandler } from './application/commands/initiate-oauth/initiate-oauth.handler';
import { CompleteOAuthHandler } from './application/commands/complete-oauth/complete-oauth.handler';
import { RevokeTokenHandler } from './application/commands/revoke-token/revoke-token.handler';
import { RefreshTokenHandler } from './application/commands/refresh-token/refresh-token.handler';
import { GetValidTokenHandler } from './application/queries/get-valid-token/get-valid-token.handler';
import { ListTokensHandler } from './application/queries/list-tokens/list-tokens.handler';
import { ListAccountsHandler } from './application/queries/list-accounts/list-accounts.handler';
import { TestOAuthConnectionHandler } from './application/queries/test-oauth-connection/test-oauth-connection.handler';

// Application event handlers
import { OnTokenRevokedHandler } from './application/handlers/events/on-token-revoked/on-token-revoked.handler';
import { OnTokenRefreshedHandler } from './application/handlers/events/on-token-refreshed/on-token-refreshed.handler';
import { OnAccountConnectedHandler } from './application/handlers/events/on-account-connected/on-account-connected.handler';
import { OnAccountDisconnectedHandler } from './application/handlers/events/on-account-disconnected/on-account-disconnected.handler';

// Application services
import { TokenVaultFacade, TOKEN_VAULT_FACADE } from './application/services/token-vault.facade';

// Ports
import { OAUTH_PROVIDER_REGISTRY } from './application/ports/oauth-provider.port';
import type { IOAuthProvider } from './application/ports/oauth-provider.port';

// Infrastructure
import { AesTokenEncryptor } from './infrastructure/crypto/aes-token-encryptor';
import { GoogleOAuthProvider } from './infrastructure/providers/google-oauth.provider';
import { MicrosoftOAuthProvider } from './infrastructure/providers/microsoft-oauth.provider';

// Presentation
import { OAuthController } from './presentation/controllers/oauth.controller';

export { TokenVaultModuleOptions } from './token-vault-options';
export { TokenVaultOptionsSchema } from './token-vault.schema';

export interface TokenVaultAsyncOptions
  extends DynamicModuleAsyncOptions<TokenVaultModuleOptions> { }

const COMMAND_HANDLERS = [
  InitiateOAuthHandler,
  CompleteOAuthHandler,
  RevokeTokenHandler,
  RefreshTokenHandler,
];

const QUERY_HANDLERS = [
  GetValidTokenHandler,
  ListTokensHandler,
  ListAccountsHandler,
  TestOAuthConnectionHandler,
];

const EVENT_HANDLERS = [
  OnTokenRevokedHandler,
  OnTokenRefreshedHandler,
  OnAccountConnectedHandler,
  OnAccountDisconnectedHandler,
];

const TOKEN_VAULT_MODULE_VALIDATOR = Symbol('TokenVaultModule.internalValidator');

@Injectable()
class TokenVaultModuleValidator extends BaseModuleValidator {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }

  protected getModuleName(): string {
    return 'TokenVaultModule';
  }

  protected validateModule(): void {
    this.requirePort(
      IOAuthTokenRepository,
      'Register IOAuthTokenRepository in PersistenceModule and import PersistenceModule before TokenVaultModule.',
    );
    this.requirePort(
      IOAuthAccountRepository,
      'Register IOAuthAccountRepository in PersistenceModule and import PersistenceModule before TokenVaultModule.',
    );
    this.requirePort(
      ILockingPort,
      'Register ILockingPort in PersistenceModule and import PersistenceModule before TokenVaultModule.',
    );
  }
}

/**
 * TokenVaultModule — full DDD-compliant, CQRS-based generic OAuth token vault.
 *
 * Registers encrypted token storage and management for Google and Microsoft
 * OAuth providers. Designed to be consumed by any module that needs delegated
 * account access (e.g. CorrespondenceModule for Gmail, DmsModule for Drive).
 *
 * HTTP routes exposed under `/auth/oauth/:provider/*`:
 *   GET  /auth/oauth/:provider/auth-url
 *   GET  /auth/oauth/:provider/callback    (public)
 *   GET  /auth/oauth/:provider/scopes
 *   GET  /auth/oauth/:provider/tokens
 *   GET  /auth/oauth/:provider/accounts
 *   DELETE /auth/oauth/:provider/tokens/:id
 *   GET  /auth/oauth/providers
 *
 * Consumer injection:
 *   @Inject(TOKEN_VAULT_FACADE) facade: TokenVaultFacade
 *   await facade.getAccessToken({ provider: 'google', scope: 'gmail.send', ownerSub })
 */
@Module({})
export class TokenVaultModule extends BaseDynamicModule {
  static forRoot(options: TokenVaultModuleOptions = {}): DynamicModule {
    return TokenVaultModule._build([
      TokenVaultModule.createOptionsProvider(TOKEN_VAULT_OPTIONS, TokenVaultOptionsSchema, options),
    ]);
  }

  static forRootAsync(options: TokenVaultAsyncOptions): DynamicModule {
    return TokenVaultModule._build(
      [
        TokenVaultModule.createAsyncOptionsProvider(TOKEN_VAULT_OPTIONS, TokenVaultOptionsSchema, options),
      ],
      options.imports,
    );
  }

  private static _build(optionsProviders: any[], extraImports: any[] = []): DynamicModule {
    return {
      module: TokenVaultModule,
      imports: [
        ...extraImports,
        CqrsModule,
        HttpModule.register({ timeout: 10_000, maxRedirects: 5 }),
      ],
      controllers: [OAuthController],
      providers: [
        ...optionsProviders,
        registerModuleValidator(TOKEN_VAULT_MODULE_VALIDATOR, TokenVaultModuleValidator),

        // Infrastructure — crypto
        AesTokenEncryptor,

        // Infrastructure — providers
        GoogleOAuthProvider,
        MicrosoftOAuthProvider,

        // Provider registry factory (Map<string, IOAuthProvider>)
        {
          provide: OAUTH_PROVIDER_REGISTRY,
          useFactory: (
            options: TokenVaultModuleOptions,
            google: GoogleOAuthProvider,
            microsoft: MicrosoftOAuthProvider,
          ): Map<string, IOAuthProvider> => {
            const map = new Map<string, IOAuthProvider>();
            if (options.googleOAuth) map.set('google', google);
            if (options.microsoftOAuth) map.set('microsoft', microsoft);
            return map;
          },
          inject: [TOKEN_VAULT_OPTIONS, GoogleOAuthProvider, MicrosoftOAuthProvider],
        },

        // Application — CQRS handlers
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
        ...EVENT_HANDLERS,

        // Application — consumer facade
        TokenVaultFacade,
        { provide: TOKEN_VAULT_FACADE, useExisting: TokenVaultFacade },
      ],
      exports: [
        // Primary consumer API
        TOKEN_VAULT_FACADE,
        TokenVaultFacade,

        // Provider registry — available for advanced consumers
        OAUTH_PROVIDER_REGISTRY,

        // Provider classes — exported for typed client access (e.g. OAuth2Client)
        GoogleOAuthProvider,
        MicrosoftOAuthProvider,

        // Crypto service — exported for modules that need to encrypt/decrypt tokens
        AesTokenEncryptor,
      ],
    };
  }
}
