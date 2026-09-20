import { ResourceSubscription } from '../aggregates/resource-subscription.aggregate';
import { ChannelType } from '../enums/channel-type.enum';

/**
 * Pure, stateless business rule: decides which subscribers should receive
 * an email based on their channel configuration.
 */
export class EmailRecipientPolicy {
  static isEmailEnabled(subscription: ResourceSubscription): boolean {
    if (!subscription.isActive) return false;
    const emailChannel = subscription.channels.find(
      (c) => c.channel === ChannelType.EMAIL,
    );
    return emailChannel?.enabled ?? true;
  }

  static getEmailRole(subscription: ResourceSubscription): string {
    const emailChannel = subscription.channels.find(
      (c) => c.channel === ChannelType.EMAIL,
    );
    return emailChannel?.emailRole ?? 'TO';
  }

  static filterEligibleSubscribers(
    subscriptions: ResourceSubscription[],
  ): ResourceSubscription[] {
    return subscriptions.filter((s) => EmailRecipientPolicy.isEmailEnabled(s));
  }
}
