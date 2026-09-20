import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export type TokenRefreshedSnapshot = {
  readonly id: string;
  readonly provider: string;
  readonly email: string;
  readonly accountId: string;
  readonly expiresAt?: string;
};

export class TokenRefreshedEvent extends DomainEvent<TokenRefreshedSnapshot> {
  constructor(snapshot: TokenRefreshedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
