import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { MarkUserNotificationReadCommand } from './mark-user-notification-read.command';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';
import { UserNotificationNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(MarkUserNotificationReadCommand)
export class MarkUserNotificationReadHandler
  implements ICommandHandler<MarkUserNotificationReadCommand>
{
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkUserNotificationReadCommand): Promise<void> {
    const userNotification = await this.userNotificationRepo.findById(
      command.userNotificationId,
    );
    if (!userNotification || userNotification.userId !== command.requestingUserId) {
      throw new UserNotificationNotFoundError(command.userNotificationId);
    }
    userNotification.markAsRead();
    await this.userNotificationRepo.update(userNotification.id, userNotification);
    const events = [...userNotification.domainEvents];
    userNotification.clearEvents();
    this.eventBus.publishAll(events);
  }
}
