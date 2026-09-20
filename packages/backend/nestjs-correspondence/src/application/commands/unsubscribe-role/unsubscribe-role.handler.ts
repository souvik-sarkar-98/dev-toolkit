import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UnsubscribeRoleCommand } from './unsubscribe-role.command';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(UnsubscribeRoleCommand)
export class UnsubscribeRoleHandler implements ICommandHandler<UnsubscribeRoleCommand> {
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UnsubscribeRoleCommand): Promise<void> {
    const subscription = await this.subscriptionRepo.findByRoleAndResource(
      command.roleName,
      command.resourceType,
      command.resourceId,
    );
    if (!subscription) {
      throw new SubscriptionNotFoundError(`${command.roleName}/${command.resourceType}`);
    }
    subscription.deactivate();
    await this.subscriptionRepo.update(subscription.id, subscription);
    const events = [...subscription.domainEvents];
    subscription.clearEvents();
    this.eventBus.publishAll(events);
  }
}
