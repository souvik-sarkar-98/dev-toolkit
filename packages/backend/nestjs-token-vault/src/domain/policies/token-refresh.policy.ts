import { OAuthToken } from '../aggregates/oauth-token/oauth-token.aggregate';

/**
 * Pure, I/O-free policy for determining whether an OAuth token needs a refresh.
 *
 * The 5-minute buffer protects against tokens expiring mid-request — it is
 * intentionally aggressive so callers always receive tokens with meaningful
 * remaining lifetime.
 */
export class TokenRefreshPolicy {
  private static readonly DEFAULT_BUFFER_MINUTES = 5;

  /**
   * Returns true if the token should be refreshed before use.
   * - Tokens with no `expiresAt` are always treated as needing refresh (unknown lifetime).
   * - Tokens within `bufferMinutes` of expiry are refreshed proactively.
   */
  static needsRefresh(token: OAuthToken, bufferMinutes = TokenRefreshPolicy.DEFAULT_BUFFER_MINUTES): boolean {
    return token.isExpired(bufferMinutes);
  }

  /**
   * Returns true if the token is strictly past its expiry time (no buffer).
   * Use for display purposes (e.g. marking tokens in the UI as expired).
   */
  static isHardExpired(token: OAuthToken): boolean {
    if (!token.expiresAt) return true;
    return Date.now() > token.expiresAt.getTime();
  }
}
