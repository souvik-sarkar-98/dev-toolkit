import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { OAuthToken, OAuthTokenFilter } from '../aggregates/oauth-token/oauth-token.aggregate';

export const IOAuthTokenRepository = Symbol('IOAuthTokenRepository');

export interface IOAuthTokenRepository
  extends IRepository<OAuthToken, string, OAuthTokenFilter> {
  /**
   * Finds a single token matching the given partial filter attributes.
   * Returns null when no match is found. Loads the account relation for display.
   */
  findByAttribute(filter: Partial<OAuthTokenFilter>): Promise<OAuthToken | null>;

  /**
   * Returns all tokens matching the filter, ordered by updatedAt desc.
   * Used during ambiguous selector resolution to pick the most recently updated credential.
   */
  findAll(filter: OAuthTokenFilter): Promise<OAuthToken[]>;
}
