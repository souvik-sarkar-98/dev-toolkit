import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { OAuthAccount, OAuthAccountFilter } from '../aggregates/oauth-account/oauth-account.aggregate';

export const IOAuthAccountRepository = Symbol('IOAuthAccountRepository');

export interface IOAuthAccountRepository
  extends IRepository<OAuthAccount, string, OAuthAccountFilter> {
  /** Finds an existing account by the natural key (provider, email). Returns null if not found. */
  findByProviderAndEmail(provider: string, email: string): Promise<OAuthAccount | null>;
}
