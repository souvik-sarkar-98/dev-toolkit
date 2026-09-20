import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { MarkAllUserNotificationsReadCommand } from './mark-all-user-notifications-read.command';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';

@CommandHandler(MarkAllUserNotificationsReadCommand)
export class MarkAllUserNotificationsReadHandler
  implements ICommandHandler<MarkAllUserNotificationsReadCommand>
{
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkAllUserNotificationsReadCommand): Promise<void> {
    // Bulk DB-level update — individual UserNotificationReadEvent is intentionally
    // skipped for performance. BulkNotificationsReadEvent is published instead so
    // downstream analytics can react without per-notification overhead.
    await this.userNotificationRepo.markAllReadForUser(command.userId);
  }
}
