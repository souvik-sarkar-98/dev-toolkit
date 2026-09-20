import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserSubscriptionsQuery } from './get-user-subscriptions.query';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { SubscriptionMapper } from '../../mappers/subscription.mapper';
import { SubscriptionResponseDto } from '../../dtos/subscription-response.dto';

@QueryHandler(GetUserSubscriptionsQuery)
export class GetUserSubscriptionsHandler
  implements IQueryHandler<GetUserSubscriptionsQuery, SubscriptionResponseDto[]>
{
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
  ) {}

  async execute(query: GetUserSubscriptionsQuery): Promise<SubscriptionResponseDto[]> {
    const subs = await this.subscriptionRepo.findAll({
      userId: query.userId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      isActive: true,
    });
    return subs.map((s) => SubscriptionMapper.toDto(s));
  }
}
