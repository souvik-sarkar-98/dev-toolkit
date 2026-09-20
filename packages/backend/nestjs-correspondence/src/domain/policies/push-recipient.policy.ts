import { ResourceSubscription } from '../aggregates/resource-subscription.aggregate';
import { ChannelType } from '../enums/channel-type.enum';

/**
 * Pure, stateless business rule: decides which subscribers should receive
 * a push notification based on their channel configuration.
 */
export class PushRecipientPolicy {
  static isPushEnabled(subscription: ResourceSubscription): boolean {
    if (!subscription.isActive) return false;
    const pushChannel = subscription.channels.find(
      (c) => c.channel === ChannelType.PUSH,
    );
    return pushChannel?.enabled ?? true;
  }

  static filterEligibleSubscribers(
    subscriptions: ResourceSubscription[],
  ): ResourceSubscription[] {
    return subscriptions.filter((s) => PushRecipientPolicy.isPushEnabled(s));
  }
}
