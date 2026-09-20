import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { ResourceSubscription } from '../aggregates/resource-subscription.aggregate';

export type SubscriptionReactivatedSnapshot = Pick<ResourceSubscription, 'id' | 'userId' | 'roleName' | 'resourceType' | 'resourceId'>;

export class SubscriptionReactivatedEvent extends DomainEvent<SubscriptionReactivatedSnapshot> {
  constructor(snapshot: SubscriptionReactivatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
