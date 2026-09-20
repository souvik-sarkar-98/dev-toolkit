import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { QueueFacade } from '@ssdev-toolkit/nestjs-queue';
import { INotificationRepository } from '../../domain/repositories/notification.repository';
import { IResourceSubscriptionRepository } from '../../domain/repositories/resource-subscription.repository';
import { CORRESPONDENCE_OPTIONS } from '../../correspondence-options.token';
import type { CorrespondenceModuleOptions } from '../../correspondence.module';
import { PurgeNotificationsJob, PurgeSubscriptionsJob } from '../../application/jobs/retention.jobs';

@Injectable()
export class RetentionSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RetentionSchedulerService.name);

  constructor(
    private readonly queueFacade: QueueFacade,
    @Inject(INotificationRepository)
    private readonly notificationRepo: INotificationRepository,
    @Inject(IResourceSubscriptionRepository)
    private readonly subscriptionRepo: IResourceSubscriptionRepository,
    @Inject(CORRESPONDENCE_OPTIONS)
    private readonly options: CorrespondenceModuleOptions,
  ) { }

  onApplicationBootstrap(): void {
    this.scheduleJobs();
  }

  private scheduleJobs(): void {
    const notificationRetentionDays = this.options.retention?.notificationRetentionDays ?? 90;
    const subscriptionRetentionDays =
      this.options.retention?.inactiveSubscriptionRetentionDays ?? 180;

    this.queueFacade
      .dispatch(new PurgeNotificationsJob({ retentionDays: notificationRetentionDays }), {
        jobId: 'corr2-purge-notifications',
        repeat: { pattern: '0 2 * * *' }, // daily at 02:00
      })
      .catch((err) =>
        this.logger.error(`Failed to schedule notification purge job: ${(err as Error).message}`),
      );

    this.queueFacade
      .dispatch(new PurgeSubscriptionsJob({ retentionDays: subscriptionRetentionDays }), {
        jobId: 'corr2-purge-subscriptions',
        repeat: { pattern: '0 3 * * 0' }, // weekly at 03:00 Sunday
      })
      .catch((err) =>
        this.logger.error(
          `Failed to schedule subscription purge job: ${(err as Error).message}`,
        ),
      );

    this.logger.log(
      `Retention jobs scheduled: notifications>${notificationRetentionDays}d, subscriptions>${subscriptionRetentionDays}d`,
    );
  }

  async purgeOldNotifications(retentionDays: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const deleted = await this.notificationRepo.deleteExpiredBefore(cutoff);
    this.logger.log(`Purged ${deleted} notifications older than ${retentionDays} days.`);
  }

  async purgeInactiveSubscriptions(retentionDays: number): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const deleted = await this.subscriptionRepo.deleteInactiveBefore(cutoff);
    this.logger.log(`Purged ${deleted} inactive subscriptions older than ${retentionDays} days.`);
  }
}
