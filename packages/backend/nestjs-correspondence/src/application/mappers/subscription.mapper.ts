import { ResourceSubscription } from '../../domain/aggregates/resource-subscription.aggregate';
import { SubscriptionResponseDto, SubscriptionChannelDto } from '../dtos/subscription-response.dto';

export class SubscriptionMapper {
  static toDto(subscription: ResourceSubscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = subscription.id;
    dto.subscriberType = subscription.subscriberType;
    dto.userId = subscription.userId;
    dto.userEmail = subscription.userEmail;
    dto.userName = subscription.userName;
    dto.roleName = subscription.roleName;
    dto.resourceType = subscription.resourceType;
    dto.resourceId = subscription.resourceId;
    dto.subscribedVia = subscription.subscribedVia;
    dto.isActive = subscription.isActive;
    dto.createdAt = subscription.createdAt;
    dto.updatedAt = subscription.updatedAt;
    dto.channels = subscription.channels.map((c) => {
      const channelDto = new SubscriptionChannelDto();
      channelDto.id = c.id;
      channelDto.channel = c.channel;
      channelDto.enabled = c.enabled;
      channelDto.emailRole = c.emailRole;
      return channelDto;
    });
    return dto;
  }
}
