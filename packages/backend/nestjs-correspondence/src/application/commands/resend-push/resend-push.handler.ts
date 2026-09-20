import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResendPushCommand } from './resend-push.command';
import { IUserNotificationRepository } from '../../../domain/repositories/user-notification.repository';
import { INotificationRepository } from '../../../domain/repositories/notification.repository';
import { IPushNotificationPort } from '../../../domain/ports/push-notification.port';
import { UserNotificationNotFoundError, NotificationNotFoundError } from '../../../domain/errors/correspondence.errors';

@CommandHandler(ResendPushCommand)
export class ResendPushHandler implements ICommandHandler<ResendPushCommand> {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
    @Inject(IPushNotificationPort)
    private readonly pushPort: IPushNotificationPort,
  ) {}

  async execute(command: ResendPushCommand): Promise<void> {
    const userNotification = await this.userNotificationRepo.findById(
      command.userNotificationId,
    );
    if (!userNotification || userNotification.userId !== command.requestingUserId) {
      throw new UserNotificationNotFoundError(command.userNotificationId);
    }

    const notification = await this.notificationRepo.findById(
      userNotification.notificationId,
    );
    if (!notification) {
      throw new NotificationNotFoundError(userNotification.notificationId);
    }

    try {
      await this.pushPort.send({
        userIds: [userNotification.userId],
        title: notification.title,
        body: notification.body,
        data: notification.metadata,
        imageUrl: notification.imageUrl,
        icon: notification.icon,
      });
      userNotification.markPushDelivered(true);
    } catch (err) {
      userNotification.markPushDelivered(false, (err as Error).message);
    }

    await this.userNotificationRepo.update(userNotification.id, userNotification);
  }
}
