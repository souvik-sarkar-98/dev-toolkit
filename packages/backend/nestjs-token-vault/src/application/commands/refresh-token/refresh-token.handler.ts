import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ILockingPort } from '@ssdev-toolkit/nestjs-persistence';
import { RefreshTokenCommand } from './refresh-token.command';
import { OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import type { IOAuthProvider } from '../../ports/oauth-provider.port';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { EncryptedToken } from '../../../domain/value-objects/encrypted-token.vo';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../../token-vault-options';
import {
  NoRefreshTokenError,
  ProviderNotConfiguredError,
  TokenExpiredError,
  TokenNotFoundError,
} from '../../../domain/errors/token-vault.errors';

/**
 * Refreshes an OAuth token using the provider's refresh endpoint.
 *
 * This handler is called internally by `GetValidTokenHandler` when it
 * detects the token is expired. It is never invoked directly by consumers.
 *
 * A distributed lock prevents concurrent refreshes for the same token,
 * which could otherwise cause two simultaneous requests to each use the
 * same (now-invalidated) refresh token and race for the new access token.
 */
@CommandHandler(RefreshTokenCommand)
@Injectable()
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand, string> {
  private readonly logger = new Logger(RefreshTokenHandler.name);

  constructor(
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    @Inject(ILockingPort) private readonly lockingService: ILockingPort,
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: RefreshTokenCommand): Promise<string> {
    const { tokenId, provider } = command.params;

    const oauthProvider = this.registry.get(provider.toLowerCase());
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const secret = this.options.encryption!.secret;
    const lockKey = `oauth:refresh:${provider}:${tokenId}`;

    let newAccessTokenPlain: string | undefined;

    await this.lockingService.withLock(lockKey, async () => {
      // Re-read inside the lock: another instance may have already refreshed.
      const fresh = await this.tokenRepo.findById(tokenId);
      if (!fresh) {
        throw new TokenNotFoundError(tokenId);
      }

      if (!fresh.isExpired()) {
        newAccessTokenPlain = await fresh.accessToken.decrypt(secret);
        return;
      }

      if (!fresh.refreshToken) {
        // MEDIUM-3: Emit TokenRevokedEvent before removing the stale token so
        // event handlers (e.g. audit log) are notified consistently.
        fresh.revoke();
        const revokeEvents = [...fresh.domainEvents];
        fresh.clearEvents();
        await this.tokenRepo.delete(fresh.id);
        this.eventBus.publishAll(revokeEvents);
        throw new NoRefreshTokenError(tokenId);
      }

      const plainRefreshToken = await fresh.refreshToken.decrypt(secret);

      let tokenSet: Awaited<ReturnType<IOAuthProvider['refreshToken']>>;
      try {
        // HIGH-3: Pass the token's stored scope so the provider only requests
        // scopes the user originally consented to (not all installation scopes).
        tokenSet = await oauthProvider.refreshToken({
          refreshToken: plainRefreshToken,
          scope: fresh.scope?.toString(),
        });
      } catch (err) {
        this.logger.warn(
          `Token refresh failed for ${provider} token ${tokenId}: ${err instanceof Error ? err.message : String(err)}. Removing stale credential.`,
        );
        fresh.revoke();
        const revokeEvents = [...fresh.domainEvents];
        fresh.clearEvents();
        await this.tokenRepo.delete(fresh.id);
        this.eventBus.publishAll(revokeEvents);
        throw new TokenExpiredError(tokenId);
      }

      const encryptedAccess = await EncryptedToken.fromPlaintext(tokenSet.accessToken, secret);
      const encryptedRefresh = tokenSet.refreshToken
        ? await EncryptedToken.fromPlaintext(tokenSet.refreshToken, secret)
        : undefined;

      fresh.refresh({
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: tokenSet.expiresAt,
        tokenType: tokenSet.tokenType,
      });

      await this.tokenRepo.update(fresh.id, fresh);

      this.eventBus.publishAll([...fresh.domainEvents]);
      fresh.clearEvents();

      newAccessTokenPlain = tokenSet.accessToken;
      this.logger.log(`Refreshed ${provider} token ${tokenId}`);
    });

    return newAccessTokenPlain!;
  }
}
