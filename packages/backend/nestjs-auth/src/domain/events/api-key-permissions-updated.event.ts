import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { ApiKey } from '../aggregates/api-key/api-key.aggregate';

export type ApiKeyPermissionsUpdatedSnapshot = Pick<ApiKey, 'id' | 'keyId' | 'permissions'>;

export class ApiKeyPermissionsUpdatedEvent extends DomainEvent<ApiKeyPermissionsUpdatedSnapshot> {
  constructor(snapshot: ApiKeyPermissionsUpdatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
