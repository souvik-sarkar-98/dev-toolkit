import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TestOAuthConnectionQuery } from './test-oauth-connection.query';
import { OAuthConnectionTestResultDto } from '../../dto/oauth-connection-test-result.dto';
import { GetValidTokenQuery } from '../get-valid-token/get-valid-token.query';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository';
import type { IOAuthTokenRepository as ITokenRepo } from '../../../domain/repositories/oauth-token.repository';
import { OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import type { IOAuthProvider } from '../../ports/oauth-provider.port';
import { TokenRefreshPolicy } from '../../../domain/policies/token-refresh.policy';
import {
  ProviderNotConfiguredError,
  TokenNotFoundError,
} from '../../../domain/errors/token-vault.errors';

/**
 * Probes a stored OAuth connection without exposing the access token.
 *
 * 1. Load the token and enforce ownership (non-admins only see their own).
 * 2. Obtain a valid access token (refreshing when near expiry).
 * 3. Call the provider profile endpoint to confirm the credential still works.
 */
@QueryHandler(TestOAuthConnectionQuery)
@Injectable()
export class TestOAuthConnectionHandler
  implements IQueryHandler<TestOAuthConnectionQuery, OAuthConnectionTestResultDto>
{
  private readonly logger = new Logger(TestOAuthConnectionHandler.name);

  constructor(
    @Inject(IOAuthTokenRepository) private readonly tokenRepo: ITokenRepo,
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: TestOAuthConnectionQuery): Promise<OAuthConnectionTestResultDto> {
    const { provider, tokenId, callerSub, isAdmin } = query.params;
    const providerKey = provider.toLowerCase();

    const oauthProvider = this.registry.get(providerKey);
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const token = await this.tokenRepo.findById(tokenId);
    if (!token || token.provider !== providerKey) {
      throw new TokenNotFoundError(tokenId);
    }

    if (!isAdmin && token.ownerSub !== callerSub) {
      throw new TokenNotFoundError(tokenId);
    }

    const neededRefresh = TokenRefreshPolicy.needsRefresh(token);

    try {
      const accessToken = await this.queryBus.execute(
        new GetValidTokenQuery({ provider: providerKey, tokenId }),
      );

      const profile = await oauthProvider.getUserProfile(accessToken as string);

      const after = await this.tokenRepo.findById(tokenId);
      const refreshed =
        neededRefresh ||
        (after?.expiresAt?.getTime() ?? 0) !== (token.expiresAt?.getTime() ?? 0);

      return {
        ok: true,
        tokenId,
        provider: providerKey,
        email: profile.email || token.email,
        refreshed,
        expiresAt: after?.expiresAt ?? token.expiresAt,
        accountName: profile.name,
        message: refreshed
          ? 'Connection is valid. Access token was refreshed during the probe.'
          : 'Connection is valid.',
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`OAuth connection test failed for ${tokenId}: ${reason}`);
      return {
        ok: false,
        tokenId,
        provider: providerKey,
        email: token.email,
        refreshed: false,
        expiresAt: token.expiresAt,
        message: 'Connection test failed. Reconnect the account or try again later.',
      };
    }
  }
}
