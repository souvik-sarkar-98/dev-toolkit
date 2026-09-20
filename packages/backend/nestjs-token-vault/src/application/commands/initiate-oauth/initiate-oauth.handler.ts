import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { CacheService } from '@ssdev-toolkit/nestjs-persistence';
import { InitiateOAuthCommand } from './initiate-oauth.command';
import { OAUTH_PROVIDER_REGISTRY } from '../../ports/oauth-provider.port';
import type { IOAuthProvider } from '../../ports/oauth-provider.port';
import { ProviderNotConfiguredError, InvalidScopeError } from '../../../domain/errors/token-vault.errors';

const STATE_CACHE_PREFIX = 'oauth:state:';
const STATE_TTL_MS = 10 * 60 * 1000;

export interface InitiateOAuthResult {
  url: string;
  state: string;
}

@CommandHandler(InitiateOAuthCommand)
@Injectable()
export class InitiateOAuthHandler implements ICommandHandler<InitiateOAuthCommand, InitiateOAuthResult> {
  constructor(
    @Inject(OAUTH_PROVIDER_REGISTRY) private readonly registry: Map<string, IOAuthProvider>,
    private readonly cacheService: CacheService,
  ) { }

  async execute(command: InitiateOAuthCommand): Promise<InitiateOAuthResult> {
    const { provider, scopes, ownerSub, customState } = command.params;

    const oauthProvider = this.registry.get(provider.toLowerCase());
    if (!oauthProvider || !oauthProvider.isConfigured) {
      throw new ProviderNotConfiguredError(provider);
    }

    const allowedScopes = await oauthProvider.getSupportedScopes();
    const invalid = scopes.filter((s) => !allowedScopes.includes(s));
    if (invalid.length > 0) {
      throw new InvalidScopeError(invalid, provider);
    }

    const state = customState ?? this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.codeChallengeS256(codeVerifier);

    await this.cacheService.set(
      `${STATE_CACHE_PREFIX}${provider.toLowerCase()}:${state}`,
      { ownerSub, codeVerifier, timestamp: Date.now() },
      STATE_TTL_MS,
    );

    const { url } = await oauthProvider.getAuthorizationUrl({
      scopes,
      state,
      codeChallenge,
      codeChallengeMethod: 'S256',
    });

    return { url, state };
  }

  private generateState(): string {
    return randomBytes(32).toString('hex');
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
  }

  private codeChallengeS256(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }
}
