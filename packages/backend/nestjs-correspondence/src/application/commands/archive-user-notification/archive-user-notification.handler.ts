import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ArchiveUserNotificationCommand } from './archive-user-notification.command';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';
import { UserNotificationNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(ArchiveUserNotificationCommand)
export class ArchiveUserNotificationHandler
  implements ICommandHandler<ArchiveUserNotificationCommand>
{
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ArchiveUserNotificationCommand): Promise<void> {
    const userNotification = await this.userNotificationRepo.findById(
      command.userNotificationId,
    );
    if (!userNotification || userNotification.userId !== command.requestingUserId) {
      throw new UserNotificationNotFoundError(command.userNotificationId);
    }
    userNotification.archive();
    await this.userNotificationRepo.update(userNotification.id, userNotification);
    const events = [...userNotification.domainEvents];
    userNotification.clearEvents();
    this.eventBus.publishAll(events);
  }
}
