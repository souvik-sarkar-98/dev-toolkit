import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { ApiKey } from '../aggregates/api-key/api-key.aggregate';

export type ApiKeyCreatedSnapshot = Pick<ApiKey, 'id' | 'name' | 'keyId' | 'permissions' | 'ownerId' | 'createdBy'>;

export class ApiKeyCreatedEvent extends DomainEvent<ApiKeyCreatedSnapshot> {
  constructor(snapshot: ApiKeyCreatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
