import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { SubscriptionDeactivatedEvent, type SubscriptionDeactivatedSnapshot } from '../events/subscription-deactivated.event';
import { SubscriptionReactivatedEvent, type SubscriptionReactivatedSnapshot } from '../events/subscription-reactivated.event';
import { SubscriberType } from '../enums/subscriber-type.enum';
import { SubscribedVia } from '../enums/subscribed-via.enum';
import { ChannelType } from '../enums/channel-type.enum';
import { EmailRole } from '../enums/email-role.enum';
import { SubscriptionChannel } from '../entities/subscription-channel.entity';

export { SubscriberType, SubscribedVia };

export interface SubscriptionFilter {
  userId?: string;
  roleName?: string;
  resourceType?: string;
  resourceId?: string;
  isActive?: boolean;
  subscriberType?: SubscriberType;
}

export class ResourceSubscription extends AggregateRoot<string> {
  #subscriberType: SubscriberType;
  #userId?: string;
  #userEmail?: string;
  #userName?: string;
  #roleName?: string;
  #resourceType: string;
  #resourceId?: string;
  #subscribedVia: SubscribedVia;
  #isActive: boolean;
  #channels: SubscriptionChannel[];

  constructor(
    id: string,
    subscriberType: SubscriberType,
    resourceType: string,
    subscribedVia: SubscribedVia,
    options?: {
      userId?: string;
      userEmail?: string;
      userName?: string;
      roleName?: string;
      resourceId?: string;
      isActive?: boolean;
      channels?: SubscriptionChannel[];
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    super(id, options?.createdAt, options?.updatedAt);
    this.#subscriberType = subscriberType;
    this.#resourceType = resourceType;
    this.#subscribedVia = subscribedVia;
    this.#userId = options?.userId;
    this.#userEmail = options?.userEmail;
    this.#userName = options?.userName;
    this.#roleName = options?.roleName;
    this.#resourceId = options?.resourceId;
    this.#isActive = options?.isActive ?? true;
    this.#channels = options?.channels ?? [];
  }

  static createUserSubscription(op: {
    userId: string;
    userEmail: string;
    userName?: string;
    resourceType: string;
    resourceId?: string;
    via: SubscribedVia;
    channels?: SubscriptionChannel[];
  }): ResourceSubscription {
    return new ResourceSubscription(
      randomUUID(),
      SubscriberType.USER,
      op.resourceType,
      op.via,
      {
        userId: op.userId,
        userEmail: op.userEmail,
        userName: op.userName,
        resourceId: op.resourceId,
        channels: op.channels ?? [],
      },
    );
  }

  static createRoleSubscription(op: {
    roleName: string;
    resourceType: string;
    resourceId?: string;
    via: SubscribedVia;
    channels?: SubscriptionChannel[];
  }): ResourceSubscription {
    return new ResourceSubscription(
      randomUUID(),
      SubscriberType.ROLE,
      op.resourceType,
      op.via,
      {
        roleName: op.roleName,
        resourceId: op.resourceId,
        channels: op.channels ?? [],
      },
    );
  }

  deactivate(): void {
    if (!this.#isActive) return;
    this.#isActive = false;
    this.touch();
    this.addDomainEvent(new SubscriptionDeactivatedEvent(this.toSnapshot<SubscriptionDeactivatedSnapshot>()));
  }

  reactivate(channels?: SubscriptionChannel[]): void {
    this.#isActive = true;
    if (channels && channels.length > 0) {
      this.#channels = channels;
    }
    this.touch();
    this.addDomainEvent(new SubscriptionReactivatedEvent(this.toSnapshot<SubscriptionReactivatedSnapshot>()));
  }

  updateChannelConfig(channel: ChannelType, enabled: boolean, emailRole?: EmailRole): void {
    const existing = this.#channels.find((c) => c.channel === channel);
    if (existing) {
      existing.updateConfig(enabled, emailRole);
    } else {
      this.#channels.push(
        SubscriptionChannel.create({
          id: randomUUID(),
          subscriptionId: this.id,
          channel,
          enabled,
          emailRole,
        }),
      );
    }
    this.touch();
  }

  updateEmail(newEmail: string): void {
    this.#userEmail = newEmail;
    this.touch();
  }

  get subscriberType(): SubscriberType { return this.#subscriberType; }
  get userId(): string | undefined { return this.#userId; }
  get userEmail(): string | undefined { return this.#userEmail; }
  get userName(): string | undefined { return this.#userName; }
  get roleName(): string | undefined { return this.#roleName; }
  get resourceType(): string { return this.#resourceType; }
  get resourceId(): string | undefined { return this.#resourceId; }
  get subscribedVia(): SubscribedVia { return this.#subscribedVia; }
  get isActive(): boolean { return this.#isActive; }
  get channels(): SubscriptionChannel[] { return this.#channels; }
}
