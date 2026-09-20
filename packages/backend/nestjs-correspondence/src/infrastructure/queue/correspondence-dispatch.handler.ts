import { Inject, Logger } from '@nestjs/common';
import { QueueHandler, IQueueHandler, Job, JobExecutionContext } from '@ssdev-toolkit/nestjs-queue';
import { CorrespondenceDispatchJob } from '../../application/jobs/correspondence-dispatch.job';
import { EmailDispatchService } from '../../application/dispatch/email-dispatch.service';
import { IPushNotificationPort } from '../../domain/ports/push-notification.port';
import { INotificationRepository } from '../../domain/repositories/notification.repository';
import { IUserNotificationRepository } from '../../domain/repositories/user-notification.repository';

@QueueHandler(CorrespondenceDispatchJob, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
})
export class CorrespondenceDispatchHandler
  implements IQueueHandler<CorrespondenceDispatchJob> {
  private readonly logger = new Logger(CorrespondenceDispatchHandler.name);

  constructor(
    private readonly emailDispatchService: EmailDispatchService,
    @Inject(IPushNotificationPort)
    private readonly pushPort: IPushNotificationPort,
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepo: IUserNotificationRepository,
  ) { }

  async execute(
    job: Job<CorrespondenceDispatchJob>,
    _ctx: JobExecutionContext,
  ): Promise<void> {
    const { payload } = job.data;
    this.logger.log(`Processing dispatchId=${payload.dispatchId}`);

    if (payload.sendEmail && payload.emailAddresses?.length && payload.templateKey) {
      try {
        await this.emailDispatchService.sendFromTemplate({
          templateKey: payload.templateKey,
          templateData: payload.templateData,
          to: payload.emailAddresses,
          cc: payload.ccAddresses,
          attachments: payload.attachments,
        });
        this.logger.log(`Email sent for dispatchId=${payload.dispatchId}`);
      } catch (err) {
        this.logger.error(
          `Email failed for dispatchId=${payload.dispatchId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    const pushUserIds = payload.pushUserIds ?? [];
    if (payload.sendPush && pushUserIds.length > 0 && payload.notificationId) {
      const notification = await this.notificationRepo.findById(payload.notificationId);
      if (notification) {
        const userNotificationIds = payload.userNotificationIds ?? [];

        // Guard against duplicate push on retry: if the job was previously retried
        // (e.g. after an email failure), push may have already been delivered successfully.
        // Checking isPushSent on the first UserNotification is sufficient — bulkMarkPushSent
        // sets all of them atomically, so if one is marked the whole batch was sent.
        if (userNotificationIds.length > 0) {
          const sample = await this.userNotificationRepo.findById(userNotificationIds[0]);
          if (sample?.isPushSent) {
            this.logger.log(
              `Push already delivered for dispatchId=${payload.dispatchId}, skipping duplicate send`,
            );
            return;
          }
        }

        try {
          await this.pushPort.send({
            userIds: pushUserIds,
            title: notification.title,
            body: notification.body,
            data: notification.metadata,
            imageUrl: notification.imageUrl,
            icon: notification.icon,
          });

          await this.notificationRepo.bulkMarkPushSent(
            userNotificationIds,
            true,
          );

          this.logger.log(
            `Push sent for dispatchId=${payload.dispatchId} users=${pushUserIds.length}`,
          );
        } catch (err) {
          this.logger.error(
            `Push failed for dispatchId=${payload.dispatchId}: ${(err as Error).message}`,
          );
          await this.notificationRepo.bulkMarkPushSent(
            userNotificationIds,
            false,
            (err as Error).message,
          );
        }
      }
    }
  }
}
