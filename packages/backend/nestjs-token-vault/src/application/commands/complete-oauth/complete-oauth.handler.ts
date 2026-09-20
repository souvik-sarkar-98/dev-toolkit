import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@ssdev-toolkit/nestjs-persistence';
import { CompleteOAuthCommand } from './complete-oauth.command';
import { OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import type { IOAuthProvider } from '../../ports/oauth-provider.port';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { IOAuthAccountRepository } from '../../../domain/repositories/oauth-account.repository';
import type { IOAuthAccountRepository as IAccountRepo } from '../../../domain/repositories/oauth-account.repository';
import { OAuthAccount } from '../../../domain/aggregates/oauth-account/oauth-account.aggregate';
import { OAuthToken } from '../../../domain/aggregates/oauth-token/oauth-token.aggregate';
import { EncryptedToken } from '../../../domain/value-objects/encrypted-token.vo';
import { TokenScope } from '../../../domain/value-objects/token-scope.vo';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../../token-vault-options';
import {
  DuplicateAuthorizationCodeError,
  InvalidCallbackStateError,
  OAuthCallbackError,
  ProviderNotConfiguredError,
} from '../../../domain/errors/token-vault.errors';

const STATE_CACHE_PREFIX = 'oauth:state:';
const CODE_CACHE_PREFIX = 'oauth:code:';
const CODE_TTL_MS = 10 * 60 * 1000;

export interface CompleteOAuthResult {
  email: string;
  tokenId: string;
}

@CommandHandler(CompleteOAuthCommand)
@Injectable()
export class CompleteOAuthHandler implements ICommandHandler<CompleteOAuthCommand, CompleteOAuthResult> {
  private readonly logger = new Logger(CompleteOAuthHandler.name);

  constructor(
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
    @Inject(IOAuthAccountRepository) private readonly accountRepo: IAccountRepo,
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: CompleteOAuthCommand): Promise<CompleteOAuthResult> {
    const { provider, code, state } = command.params;

    const oauthProvider = this.registry.get(provider.toLowerCase());
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const stateKey = `${STATE_CACHE_PREFIX}${provider.toLowerCase()}:${state}`;
    const stateData = await this.cacheService.get<{ ownerSub?: string; codeVerifier?: string }>(stateKey);
    if (!stateData) {
      throw new InvalidCallbackStateError();
    }
    await this.cacheService.del(stateKey);

    const codeKey = `${CODE_CACHE_PREFIX}${provider.toLowerCase()}:${code}`;
    if (await this.cacheService.get<boolean>(codeKey)) {
      throw new DuplicateAuthorizationCodeError();
    }

    // HIGH-1: Mark code as used BEFORE exchange to close the TOCTOU window.
    // Two concurrent callbacks with the same code will both read the cache
    // check above, but only one can win the SET — the other will fail on the
    // next request after the TTL is applied. If the exchange subsequently
    // fails we delete the key so the legitimate code can be retried.
    await this.cacheService.set(codeKey, true, CODE_TTL_MS);

    let tokenSet: Awaited<ReturnType<IOAuthProvider['exchangeCode']>>;
    try {
      tokenSet = await oauthProvider.exchangeCode({
        code,
        codeVerifier: stateData.codeVerifier,
      });
    } catch (err) {
      // HIGH-1: Remove the cache entry so the user can retry the same code.
      await this.cacheService.del(codeKey);
      this.logger.error(
        `OAuth code exchange failed for ${provider}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new OAuthCallbackError(
        err instanceof Error ? err.message : 'code exchange failed',
      );
    }

    // After successful exchange, codeKey must remain set to block replay —
    // even on downstream failure, user must re-authorize.
    //
    // HIGH-2: If getUserProfile, account upsert, or DB persist fails after a successful
    // exchange, the OAuth code is burned (marked used in cache and redeemed at the provider).
    // The provider-issued tokens are orphaned and cannot be recovered through this flow.
    // The user must re-authorize. We log enough context for manual triage.
    //
    // Note: we cannot un-burn an already-exchanged code at the provider, so the
    // trade-off is: prefer "code can never be replayed" over "code can be retried
    // on transient DB error". On a DB failure the user re-authorizes, which is safe.
    // Definite-assignment assertions (!): catch always rethrows, so these are always
    // assigned when execution continues past the try/catch block.
    let profile!: Awaited<ReturnType<IOAuthProvider['getUserProfile']>>;
    let account!: OAuthAccount;
    let token!: OAuthToken;
    try {
      profile = await oauthProvider.getUserProfile(tokenSet.accessToken, tokenSet.idToken);

      // MEDIUM-1 TODO: Inject AesTokenEncryptor (infrastructure/crypto/aes-token-encryptor.ts)
      // and call this.encryptor.encrypt(plaintext) instead of EncryptedToken.fromPlaintext
      // directly. Requires extracting an application-layer port (ITokenEncryptorPort) so the
      // handler does not import infrastructure directly. Safe for now — same algorithm underneath.
      const secret = this.options.encryption!.secret;
      const encryptedAccess = await EncryptedToken.fromPlaintext(tokenSet.accessToken, secret);
      const encryptedRefresh = tokenSet.refreshToken
        ? await EncryptedToken.fromPlaintext(tokenSet.refreshToken, secret)
        : undefined;
      const scope = tokenSet.scope ? TokenScope.fromStorage(tokenSet.scope) : null;

      account = await this.upsertAccount(oauthProvider.providerKey, profile);

      const existing = await this.tokenRepo.findByAttribute({
        email: profile.email,
        provider: oauthProvider.providerKey,
        clientId: this.resolveClientId(oauthProvider),
      });

      if (existing) {
        // HIGH-4: Pass scope and ownerSub so they are updated on re-authorisation.
        existing.refresh({
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          expiresAt: tokenSet.expiresAt,
          tokenType: tokenSet.tokenType,
          scope: scope ?? undefined,
          ownerSub: stateData.ownerSub,
        });
        token = await this.tokenRepo.update(existing.id, existing);
        this.eventBus.publishAll([...existing.domainEvents]);
        existing.clearEvents();
      } else {
        const newToken = OAuthToken.create({
          accountId: account.id,
          clientId: this.resolveClientId(oauthProvider),
          provider: oauthProvider.providerKey,
          email: profile.email,
          ownerSub: stateData.ownerSub,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenType: tokenSet.tokenType,
          expiresAt: tokenSet.expiresAt,
          scope: scope ?? undefined,
        });
        token = await this.tokenRepo.create(newToken);
        // HIGH-5: Publish domain events for the newly created token.
        const tokenEvents = [...newToken.domainEvents];
        newToken.clearEvents();
        this.eventBus.publishAll(tokenEvents);
      }
    } catch (err) {
      // HIGH-2: Code is burned, provider tokens are orphaned. Log for manual recovery.
      this.logger.warn(
        `[TokenVault] Post-exchange failure after successful OAuth exchange. ` +
        `provider=${provider} email=${profile?.email ?? 'unknown'} accountId=${account?.id ?? 'unknown'}. ` +
        `The authorization code is burned; provider-issued tokens are unreachable. ` +
        `User must re-authorize. Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    this.eventBus.publishAll([...account.domainEvents]);
    account.clearEvents();

    this.logger.log(`OAuth ${provider} token stored for ${profile.email}`);
    return { email: profile.email, tokenId: token.id };
  }

  private async upsertAccount(
    provider: string,
    profile: Awaited<ReturnType<IOAuthProvider['getUserProfile']>>,
  ) {
    const existing = await this.accountRepo.findByProviderAndEmail(provider, profile.email);
    if (existing) {
      existing.updateProfile(profile);
      return await this.accountRepo.update(existing.id, existing);
    }
    return await this.accountRepo.create(OAuthAccount.create(provider, profile));
  }

  private resolveClientId(provider: IOAuthProvider): string {
    const key = provider.providerKey;
    if (key === 'google') return this.options.googleOAuth?.clientId ?? '';
    if (key === 'microsoft') return this.options.microsoftOAuth?.clientId ?? '';
    return key;
  }
}
