import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { EncryptedToken } from '../../value-objects/encrypted-token.vo';
import { TokenScope } from '../../value-objects/token-scope.vo';
import { TokenRefreshedEvent, type TokenRefreshedSnapshot } from '../../events/token-refreshed.event';
import { TokenRevokedEvent, type TokenRevokedSnapshot } from '../../events/token-revoked.event';

/**
 * Read-only snapshot of the owning `OAuthAccount`, populated only when the
 * repository loads the relation. Never part of `OAuthToken` identity — purely
 * a display convenience for list/detail DTOs.
 */
export interface OAuthAccountSnapshot {
  id: string;
  email: string;
  externalId?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  locale?: string;
}

export class OAuthTokenFilter {
  provider?: string;
  clientId?: string;
  scope?: string;
  email?: string;
  /** Account id, email, or display-name fragment used by admin list filtering. */
  account?: string;
  ownerSub?: string;
}

/**
 * A scoped OAuth credential set (access token + optional refresh token) for a
 * specific (account, clientId) combination.
 *
 * Design invariants:
 * - The aggregate never holds plaintext — `#accessToken` and `#refreshToken`
 *   are always `EncryptedToken` value objects.
 * - Callers that need the plaintext must call `accessToken.decrypt(secret)` /
 *   `refreshToken.decrypt(secret)` on the VO; the secret is not stored here.
 * - Every state-changing method fires a domain event.
 */
export class OAuthToken extends AggregateRoot<string> {
  readonly #accountId: string;
  readonly #clientId: string;
  readonly #provider: string;
  readonly #email: string;
  #ownerSub: string | undefined;
  #scope: TokenScope | null;
  #accessToken: EncryptedToken;
  #refreshToken: EncryptedToken | null;
  #tokenType: string | undefined;
  #expiresAt: Date | undefined;
  readonly #account: OAuthAccountSnapshot | undefined;

  protected constructor(data: {
    id: string;
    accountId: string;
    clientId: string;
    provider: string;
    email: string;
    ownerSub?: string;
    accessToken: EncryptedToken;
    refreshToken?: EncryptedToken | null;
    tokenType?: string;
    expiresAt?: Date;
    scope?: TokenScope | null;
    createdAt?: Date;
    updatedAt?: Date;
    account?: OAuthAccountSnapshot;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this.#accountId = data.accountId;
    this.#clientId = data.clientId;
    this.#provider = data.provider;
    this.#email = data.email;
    this.#ownerSub = data.ownerSub;
    this.#accessToken = data.accessToken;
    this.#refreshToken = data.refreshToken ?? null;
    this.#tokenType = data.tokenType;
    this.#expiresAt = data.expiresAt;
    this.#scope = data.scope ?? null;
    this.#account = data.account;
  }

  static create(data: {
    accountId: string;
    clientId: string;
    provider: string;
    email: string;
    ownerSub?: string;
    accessToken: EncryptedToken;
    refreshToken?: EncryptedToken;
    tokenType?: string;
    expiresAt?: Date;
    scope?: TokenScope;
  }): OAuthToken {
    return new OAuthToken({
      id: randomUUID(),
      ...data,
    });
  }

  /**
   * Reconstitutes an `OAuthToken` from a raw persistence row.
   * Use this in `toDomain` mappings inside repository implementations to avoid
   * calling `new OAuthToken(...)` directly from outside the domain boundary.
   */
  static rehydrate(data: {
    id: string;
    accountId: string;
    clientId: string;
    provider: string;
    email: string;
    ownerSub?: string;
    accessToken: EncryptedToken;
    refreshToken?: EncryptedToken | null;
    tokenType?: string;
    expiresAt?: Date;
    scope?: TokenScope | null;
    createdAt?: Date;
    updatedAt?: Date;
    account?: OAuthAccountSnapshot;
  }): OAuthToken {
    return new OAuthToken(data);
  }

  /**
   * Updates the stored credential after a successful token refresh.
   * Providers may or may not issue a new refresh token on each refresh cycle.
   * Passing `scope` and `ownerSub` keeps them current after re-authorisation.
   */
  refresh(data: {
    accessToken: EncryptedToken;
    refreshToken?: EncryptedToken;
    expiresAt?: Date;
    tokenType?: string;
    scope?: TokenScope;
    ownerSub?: string;
  }): void {
    this.#accessToken = data.accessToken;
    if (data.refreshToken) {
      this.#refreshToken = data.refreshToken;
    }
    this.#expiresAt = data.expiresAt ?? this.#expiresAt;
    this.#tokenType = data.tokenType ?? this.#tokenType;
    if (data.scope) this.#scope = data.scope;
    if (data.ownerSub) this.#ownerSub = data.ownerSub;
    this.touch();
    this.addDomainEvent(new TokenRefreshedEvent(this.toSnapshot<TokenRefreshedSnapshot>()));
  }

  /** Marks the token as revoked. The handler is responsible for deletion from the repository. */
  revoke(): void {
    this.touch();
    this.addDomainEvent(new TokenRevokedEvent(this.toSnapshot<TokenRevokedSnapshot>()));
  }

  /**
   * Returns true when the token is expired or approaching expiry (within 5 min).
   * A token with no `expiresAt` is treated as expired so callers always attempt
   * a refresh — this avoids silently serving a token that may have been revoked
   * server-side.
   */
  isExpired(bufferMinutes = 5): boolean {
    if (!this.#expiresAt) return true;
    const bufferMs = bufferMinutes * 60 * 1000;
    return Date.now() + bufferMs > this.#expiresAt.getTime();
  }

  get accountId(): string { return this.#accountId; }
  get clientId(): string { return this.#clientId; }
  get provider(): string { return this.#provider; }
  get email(): string { return this.#email; }
  get ownerSub(): string | undefined { return this.#ownerSub; }
  get accessToken(): EncryptedToken { return this.#accessToken; }
  get refreshToken(): EncryptedToken | null { return this.#refreshToken; }
  get tokenType(): string | undefined { return this.#tokenType; }
  get expiresAt(): Date | undefined { return this.#expiresAt; }
  get scope(): TokenScope | null { return this.#scope; }
  get account(): OAuthAccountSnapshot | undefined { return this.#account; }
}
