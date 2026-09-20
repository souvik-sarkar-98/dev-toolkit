import { BaseDomain } from '@ssdev-toolkit/nestjs-core';
import { ChannelType } from '../enums/channel-type.enum';
import { EmailRole } from '../enums/email-role.enum';

export class SubscriptionChannel extends BaseDomain<string> {
  #subscriptionId: string;
  #channel: ChannelType;
  #enabled: boolean;
  #emailRole?: EmailRole;

  constructor(
    id: string,
    subscriptionId: string,
    channel: ChannelType,
    options?: {
      enabled?: boolean;
      emailRole?: EmailRole;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    super(id, options?.createdAt, options?.updatedAt);
    this.#subscriptionId = subscriptionId;
    this.#channel = channel;
    this.#enabled = options?.enabled ?? true;
    this.#emailRole = options?.emailRole;
  }

  static create(op: {
    id: string;
    subscriptionId: string;
    channel: ChannelType;
    enabled?: boolean;
    emailRole?: EmailRole;
  }): SubscriptionChannel {
    return new SubscriptionChannel(op.id, op.subscriptionId, op.channel, {
      enabled: op.enabled,
      emailRole: op.emailRole,
    });
  }

  updateConfig(enabled: boolean, emailRole?: EmailRole): void {
    this.#enabled = enabled;
    this.#emailRole = emailRole;
    this.touch();
  }

  get subscriptionId(): string {
    return this.#subscriptionId;
  }

  get channel(): ChannelType {
    return this.#channel;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  get emailRole(): EmailRole | undefined {
    return this.#emailRole;
  }
}
