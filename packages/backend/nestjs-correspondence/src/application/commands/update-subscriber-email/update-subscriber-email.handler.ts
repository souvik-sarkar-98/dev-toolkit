import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateSubscriberEmailCommand } from './update-subscriber-email.command';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';

@CommandHandler(UpdateSubscriberEmailCommand)
export class UpdateSubscriberEmailHandler
  implements ICommandHandler<UpdateSubscriberEmailCommand>
{
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
  ) {}

  async execute(command: UpdateSubscriberEmailCommand): Promise<void> {
    await this.subscriptionRepo.updateEmailForUser(command.userId, command.newEmail);
  }
}
