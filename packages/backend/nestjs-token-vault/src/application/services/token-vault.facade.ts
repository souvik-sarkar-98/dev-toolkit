import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { InitiateOAuthCommand } from '../commands/initiate-oauth/initiate-oauth.command';
import type { InitiateOAuthResult } from '../commands/initiate-oauth/initiate-oauth.handler';
import { GetValidTokenQuery } from '../queries/get-valid-token/get-valid-token.query';

export const TOKEN_VAULT_FACADE = Symbol('TOKEN_VAULT_FACADE');

/**
 * The primary programmatic API for external module consumers.
 *
 * This facade is the ONLY thing that `CorrespondenceModule`, `DmsModule`,
 * `MeetingModule`, or any future consumer needs to inject. It provides a
 * clean, provider-agnostic interface — callers never need to know about
 * `IOAuthProvider`, `OAuthToken`, CQRS, or encryption internals.
 *
 * Inject via the `TOKEN_VAULT_FACADE` symbol to keep the dependency on
 * the concrete class out of consumer modules.
 */
@Injectable()
export class TokenVaultFacade {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Returns a valid, decrypted access token for the given provider + scope.
   *
   * The facade handles all complexity transparently:
   * - Token lookup by scope/email/ownerSub
   * - Automatic refresh when the token is near or past expiry (5-min buffer)
   * - Distributed lock to prevent concurrent refresh races
   *
   * @throws {TokenNotFoundError} — no stored token matches the selector
   * @throws {ProviderNotConfiguredError} — the requested provider is not set up
   * @throws {TokenExpiredError} — token could not be refreshed; re-auth required
   */
  async getAccessToken(options: {
    provider: string;
    scope?: string | string[];
    email?: string;
    ownerSub?: string;
    tokenId?: string;
  }): Promise<string> {
    return this.queryBus.execute<GetValidTokenQuery, string>(
      new GetValidTokenQuery(options),
    );
  }

  /**
   * Generates an OAuth authorization URL to redirect the user to.
   *
   * The state and PKCE verifier are stored server-side (cache). The user
   * must complete the callback flow (`/auth/oauth/:provider/callback`)
   * to exchange the code and store the resulting tokens.
   */
  async getAuthorizationUrl(options: {
    provider: string;
    scopes: string[];
    ownerSub?: string;
  }): Promise<InitiateOAuthResult> {
    return this.commandBus.execute<InitiateOAuthCommand, InitiateOAuthResult>(
      new InitiateOAuthCommand({
        provider: options.provider,
        scopes: options.scopes,
        ownerSub: options.ownerSub,
      }),
    );
  }
}
