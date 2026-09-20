import { Inject, ForbiddenException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UnsubscribeUserCommand } from './unsubscribe-user.command';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(UnsubscribeUserCommand)
export class UnsubscribeUserHandler implements ICommandHandler<UnsubscribeUserCommand> {
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UnsubscribeUserCommand): Promise<void> {
    let subscription;

    if (command.subscriptionId) {
      subscription = await this.subscriptionRepo.findById(command.subscriptionId);
      if (!subscription) {
        throw new SubscriptionNotFoundError(command.subscriptionId);
      }
      if (subscription.userId !== command.userId) {
        throw new ForbiddenException('You do not own this subscription');
      }
    } else {
      subscription = await this.subscriptionRepo.findByUserAndResource(
        command.userId,
        command.resourceType!,
        command.resourceId,
      );
      if (!subscription) {
        throw new SubscriptionNotFoundError(`${command.userId}/${command.resourceType}`);
      }
    }

    subscription.deactivate();
    await this.subscriptionRepo.update(subscription.id, subscription);
    const events = [...subscription.domainEvents];
    subscription.clearEvents();
    this.eventBus.publishAll(events);
  }
}
