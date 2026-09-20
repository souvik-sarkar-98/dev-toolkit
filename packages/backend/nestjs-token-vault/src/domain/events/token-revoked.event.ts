import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { OAuthToken } from '../aggregates/oauth-token/oauth-token.aggregate';

export type TokenRevokedSnapshot = Pick<OAuthToken, 'id' | 'provider' | 'email' | 'accountId'>;

export class TokenRevokedEvent extends DomainEvent<TokenRevokedSnapshot> {
  constructor(snapshot: TokenRevokedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
