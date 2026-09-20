import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RevokeTokenCommand } from './revoke-token.command';
import { OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import type { IOAuthProvider } from '../../ports/oauth-provider.port';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../../token-vault-options';
import { ProviderNotConfiguredError, TokenNotFoundError } from '../../../domain/errors/token-vault.errors';

@CommandHandler(RevokeTokenCommand)
@Injectable()
export class RevokeTokenHandler implements ICommandHandler<RevokeTokenCommand, void> {
  private readonly logger = new Logger(RevokeTokenHandler.name);

  constructor(
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RevokeTokenCommand): Promise<void> {
    const { tokenId, provider, callerSub, isAdmin } = command.params;

    const oauthProvider = this.registry.get(provider.toLowerCase());
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const token = await this.tokenRepo.findById(tokenId);
    if (!token) {
      throw new TokenNotFoundError(tokenId);
    }

    if (!isAdmin && token.ownerSub !== callerSub) {
      // Use 404 to avoid disclosing the existence of another user's token.
      throw new TokenNotFoundError(tokenId);
    }

    const secret = this.options.encryption!.secret;
    const plainAccessToken = await token.accessToken.decrypt(secret);

    try {
      await oauthProvider.revokeToken(plainAccessToken);
      this.logger.log(`Revoked ${provider} token ${tokenId} at provider`);
    } catch (err) {
      this.logger.warn(
        `Provider revocation failed for ${provider} token ${tokenId}: ${err instanceof Error ? err.message : String(err)}. Removing from local storage anyway.`,
      );
    }

    token.revoke();

    await this.tokenRepo.delete(token.id);

    this.eventBus.publishAll([...token.domainEvents]);
    token.clearEvents();
  }
}
