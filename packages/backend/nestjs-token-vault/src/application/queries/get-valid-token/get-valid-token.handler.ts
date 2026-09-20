import { CommandBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { GetValidTokenQuery } from './get-valid-token.query';
import { RefreshTokenCommand } from '../../commands/refresh-token/refresh-token.command';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { IOAuthProvider, OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import { TokenRefreshPolicy } from '../../../domain/policies/token-refresh.policy';
import { TOKEN_VAULT_OPTIONS, TokenVaultModuleOptions } from '../../../token-vault-options';
import { OAuthTokenFilter } from '../../../domain/aggregates/oauth-token/oauth-token.aggregate';
import {
  AmbiguousTokenSelectionError,
  ProviderNotConfiguredError,
  TokenNotFoundError,
} from '../../../domain/errors/token-vault.errors';

/**
 * The core read-side handler for programmatic consumers.
 *
 * Returns a decrypted, valid access token string. If the stored token is
 * near expiry, this handler transparently dispatches a `RefreshTokenCommand`
 * before returning — callers always receive a token with meaningful remaining
 * lifetime without any awareness of the refresh cycle.
 */
@QueryHandler(GetValidTokenQuery)
@Injectable()
export class GetValidTokenHandler implements IQueryHandler<GetValidTokenQuery, string> {
  private readonly logger = new Logger(GetValidTokenHandler.name);

  constructor(
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    @Inject(TOKEN_VAULT_OPTIONS) private readonly options: TokenVaultModuleOptions,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(query: GetValidTokenQuery): Promise<string> {
    const { provider, scope, email, ownerSub, tokenId } = query.params;

    const oauthProvider = this.registry.get(provider.toLowerCase());
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const token = tokenId
      ? await this.resolveById(tokenId, provider)
      : await this.resolveByFilter(provider, { scope, email, ownerSub });

    if (TokenRefreshPolicy.needsRefresh(token)) {
      return await this.commandBus.execute(
        new RefreshTokenCommand({ tokenId: token.id, provider }),
      );
    }

    return token.accessToken.decrypt(this.options.encryption!.secret);
  }

  private async resolveById(tokenId: string, provider: string) {
    const found = await this.tokenRepo.findById(tokenId);
    if (!found) throw new TokenNotFoundError(`id=${tokenId}`);
    if (found.provider !== provider.toLowerCase()) {
      throw new TokenNotFoundError(`id=${tokenId} does not belong to provider ${provider}`);
    }
    return found;
  }

  private async resolveByFilter(
    provider: string,
    filter: { scope?: string | string[]; email?: string; ownerSub?: string },
  ) {
    const scopeStr = Array.isArray(filter.scope)
      ? filter.scope.join(' ')
      : filter.scope;

    const tokenFilter: OAuthTokenFilter = {
      provider: provider.toLowerCase(),
      ...(scopeStr ? { scope: scopeStr } : {}),
      ...(filter.email ? { email: filter.email } : {}),
      ...(filter.ownerSub ? { ownerSub: filter.ownerSub } : {}),
    };

    const candidates = await this.tokenRepo.findAll(tokenFilter);

    if (candidates.length === 0) {
      throw new TokenNotFoundError(`provider=${provider}, scope=${scopeStr ?? '(any)'}`);
    }

    if (candidates.length === 1) return candidates[0];

    const hasDisambiguator = !!(filter.email || filter.ownerSub);
    if (hasDisambiguator) {
      throw new AmbiguousTokenSelectionError(provider, candidates.length);
    }

    // Backward-compat: multiple tokens with no disambiguator → pick most recently updated.
    const sorted = [...candidates].sort(
      (a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
    );
    const selected = sorted[0];
    this.logger.warn(
      `Ambiguous token selection for provider "${provider}": ${candidates.length} candidates matched ` +
      `with no email/ownerSub/tokenId disambiguator. ` +
      `Selected most recently updated token: tokenId=${selected.id} email=${selected.email} ` +
      `updatedAt=${selected.updatedAt?.toISOString() ?? 'unknown'}. ` +
      `Provide "email", "ownerSub", or "tokenId" for deterministic selection.`,
    );
    return selected;
  }
}
