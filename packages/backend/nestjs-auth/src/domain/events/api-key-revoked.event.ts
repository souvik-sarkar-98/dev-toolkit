import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { ApiKey } from '../aggregates/api-key/api-key.aggregate';

export type ApiKeyRevokedSnapshot = Pick<ApiKey, 'id' | 'keyId' | 'name'>;

export class ApiKeyRevokedEvent extends DomainEvent<ApiKeyRevokedSnapshot> {
  constructor(snapshot: ApiKeyRevokedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
