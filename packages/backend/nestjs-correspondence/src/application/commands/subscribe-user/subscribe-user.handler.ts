import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { SubscribeUserCommand } from './subscribe-user.command';
import { IResourceSubscriptionRepository } from '../../../domain/repositories/resource-subscription.repository';
import { ResourceSubscription } from '../../../domain/aggregates/resource-subscription.aggregate';
import { SubscriptionChannel } from '../../../domain/entities/subscription-channel.entity';
import { CORRESPONDENCE_OPTIONS } from '../../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../../correspondence.schema';
import { assertResourceTypeAllowed } from '../../utilities/resource-type-access.util';

@CommandHandler(SubscribeUserCommand)
export class SubscribeUserHandler implements ICommandHandler<SubscribeUserCommand> {
  constructor(
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
    private readonly eventBus: EventBus,
    @Inject(CORRESPONDENCE_OPTIONS)
    private readonly options: CorrespondenceModuleOptions,
  ) {}

  async execute(command: SubscribeUserCommand): Promise<void> {
    assertResourceTypeAllowed(command.resourceType, this.options.allowedResourceTypes);

    const existing = await this.subscriptionRepo.findByUserAndResource(
      command.userId,
      command.resourceType,
      command.resourceId,
    );

    if (existing) {
      if (existing.isActive) return;

      const channels = (command.channels ?? []).map((c) =>
        SubscriptionChannel.create({
          id: randomUUID(),
          subscriptionId: existing.id,
          channel: c.channel,
          enabled: c.enabled ?? true,
          emailRole: c.emailRole,
        }),
      );

      existing.reactivate(channels.length > 0 ? channels : undefined);
      await this.subscriptionRepo.update(existing.id, existing);
      const events = [...existing.domainEvents];
      existing.clearEvents();
      this.eventBus.publishAll(events);
      return;
    }

    const channels = (command.channels ?? []).map((c) =>
      SubscriptionChannel.create({
        id: randomUUID(),
        subscriptionId: '', // will be replaced after aggregate creation
        channel: c.channel,
        enabled: c.enabled ?? true,
        emailRole: c.emailRole,
      }),
    );

    const subscription = ResourceSubscription.createUserSubscription({
      userId: command.userId,
      userEmail: command.userEmail ?? '',
      userName: command.userName,
      resourceType: command.resourceType,
      resourceId: command.resourceId,
      via: command.via,
      channels,
    });

    await this.subscriptionRepo.create(subscription);
  }
}
