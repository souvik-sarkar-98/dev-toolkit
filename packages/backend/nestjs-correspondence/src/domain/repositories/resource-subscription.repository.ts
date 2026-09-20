import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { ResourceSubscription, SubscriptionFilter } from '../aggregates/resource-subscription.aggregate';

export interface IResourceSubscriptionRepository
  extends IRepository<ResourceSubscription, string, SubscriptionFilter> {
  findByUserAndResource(
    userId: string,
    resourceType: string,
    resourceId?: string,
  ): Promise<ResourceSubscription | null>;

  findByRoleAndResource(
    roleName: string,
    resourceType: string,
    resourceId?: string,
  ): Promise<ResourceSubscription | null>;

  /** Find all active user subscriptions for a resource (expands role memberships) */
  findActiveSubscribersForResource(
    resourceType: string,
    resourceId?: string,
  ): Promise<ResourceSubscription[]>;

  /** Update the cached email for all subscriptions belonging to a user */
  updateEmailForUser(userId: string, newEmail: string): Promise<void>;

  /** Delete inactive subscriptions older than the given date */
  deleteInactiveBefore(date: Date): Promise<number>;
}

export const IResourceSubscriptionRepository = Symbol('IResourceSubscriptionRepository');
