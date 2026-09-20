import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { ResourceSubscription } from '../aggregates/resource-subscription.aggregate';

export type SubscriptionDeactivatedSnapshot = Pick<ResourceSubscription, 'id' | 'userId' | 'roleName' | 'resourceType' | 'resourceId'>;

export class SubscriptionDeactivatedEvent extends DomainEvent<SubscriptionDeactivatedSnapshot> {
  constructor(snapshot: SubscriptionDeactivatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
