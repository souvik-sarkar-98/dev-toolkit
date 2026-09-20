import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { AccountConnectedEvent, type AccountConnectedSnapshot } from '../../events/account-connected.event';
import { AccountDisconnectedEvent, type AccountDisconnectedSnapshot } from '../../events/account-disconnected.event';

/**
 * Profile attributes returned by an OAuth provider after a successful authorization.
 * `email` is the only field every provider guarantees; all others are best-effort.
 */
export interface OAuthUserProfile {
  /** Provider-issued stable subject/object id (Google `sub`, Microsoft object `id`). */
  externalId?: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  locale?: string;
}

export class OAuthAccountFilter {
  provider?: string;
  email?: string;
}

/**
 * A connected external identity — one Google or Microsoft account.
 *
 * One account can own multiple `OAuthToken` rows — one per OAuth client app
 * (clientId) that has been authorized against the same identity.
 *
 * Lifecycle: connected → profile refreshed on re-auth → disconnected.
 */
export class OAuthAccount extends AggregateRoot<string> {
  readonly #provider: string;
  #email: string;
  #externalId: string | undefined;
  #name: string | undefined;
  #givenName: string | undefined;
  #familyName: string | undefined;
  #pictureUrl: string | undefined;
  #locale: string | undefined;

  protected constructor(data: {
    id: string;
    provider: string;
    email: string;
    externalId?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    pictureUrl?: string;
    locale?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this.#provider = data.provider;
    this.#email = data.email;
    this.#externalId = data.externalId;
    this.#name = data.name;
    this.#givenName = data.givenName;
    this.#familyName = data.familyName;
    this.#pictureUrl = data.pictureUrl;
    this.#locale = data.locale;
  }

  static create(provider: string, profile: OAuthUserProfile): OAuthAccount {
    const account = new OAuthAccount({
      id: randomUUID(),
      provider,
      email: profile.email,
      externalId: profile.externalId,
      name: profile.name,
      givenName: profile.givenName,
      familyName: profile.familyName,
      pictureUrl: profile.pictureUrl,
      locale: profile.locale,
    });
    account.addDomainEvent(new AccountConnectedEvent(account.toSnapshot<AccountConnectedSnapshot>()));
    return account;
  }

  /**
   * Reconstitutes an `OAuthAccount` from a raw persistence row.
   * Use this in `toDomain` mappings inside repository implementations to avoid
   * calling `new OAuthAccount(...)` directly from outside the domain boundary.
   */
  static rehydrate(data: {
    id: string;
    provider: string;
    email: string;
    externalId?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    pictureUrl?: string;
    locale?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): OAuthAccount {
    return new OAuthAccount(data);
  }

  /** Refreshes profile attributes from the provider on every re-authentication. */
  updateProfile(profile: OAuthUserProfile): void {
    this.#email = profile.email;
    this.#externalId = profile.externalId ?? this.#externalId;
    this.#name = profile.name;
    this.#givenName = profile.givenName;
    this.#familyName = profile.familyName;
    this.#pictureUrl = profile.pictureUrl;
    this.#locale = profile.locale;
    this.touch();
  }

  /** Marks the account as disconnected. All associated tokens must be revoked separately. */
  disconnect(): void {
    this.touch();
    this.addDomainEvent(new AccountDisconnectedEvent(this.toSnapshot<AccountDisconnectedSnapshot>()));
  }

  get provider(): string { return this.#provider; }
  get email(): string { return this.#email; }
  get externalId(): string | undefined { return this.#externalId; }
  get name(): string | undefined { return this.#name; }
  get givenName(): string | undefined { return this.#givenName; }
  get familyName(): string | undefined { return this.#familyName; }
  get pictureUrl(): string | undefined { return this.#pictureUrl; }
  get locale(): string | undefined { return this.#locale; }
}
