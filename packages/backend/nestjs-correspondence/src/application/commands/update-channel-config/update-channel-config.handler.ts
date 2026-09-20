import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateChannelConfigCommand } from './update-channel-config.command';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { SubscriptionNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(UpdateChannelConfigCommand)
export class UpdateChannelConfigHandler
  implements ICommandHandler<UpdateChannelConfigCommand>
{
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
  ) {}

  async execute(command: UpdateChannelConfigCommand): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(command.subscriptionId);
    if (!subscription || subscription.userId !== command.requestingUserId) {
      throw new SubscriptionNotFoundError(command.subscriptionId);
    }
    subscription.updateChannelConfig(command.channel, command.enabled, command.emailRole);
    await this.subscriptionRepo.update(subscription.id, subscription);
  }
}
