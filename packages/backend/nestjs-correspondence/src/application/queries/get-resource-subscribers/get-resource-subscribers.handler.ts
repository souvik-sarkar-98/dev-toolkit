import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetResourceSubscribersQuery } from './get-resource-subscribers.query';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { SubscriptionMapper } from '../../mappers/subscription.mapper';
import { SubscriptionResponseDto } from '../../dtos/subscription-response.dto';

@QueryHandler(GetResourceSubscribersQuery)
export class GetResourceSubscribersHandler
  implements IQueryHandler<GetResourceSubscribersQuery, SubscriptionResponseDto[]>
{
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
  ) {}

  async execute(query: GetResourceSubscribersQuery): Promise<SubscriptionResponseDto[]> {
    const subs = await this.subscriptionRepo.findActiveSubscribersForResource(
      query.resourceType,
      query.resourceId,
    );
    return subs.map((s) => SubscriptionMapper.toDto(s));
  }
}
