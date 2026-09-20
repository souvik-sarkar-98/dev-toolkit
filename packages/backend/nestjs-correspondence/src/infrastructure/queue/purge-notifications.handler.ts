import { Inject } from '@nestjs/common';
import { QueueHandler, IQueueHandler, Job, JobExecutionContext } from '@ssdev-toolkit/nestjs-queue';
import { PurgeNotificationsJob } from '../../application/jobs/retention.jobs';
import { RetentionSchedulerService } from '../../application/retention/retention-scheduler.service';

@QueueHandler(PurgeNotificationsJob, { attempts: 1 })
export class PurgeNotificationsHandler implements IQueueHandler<PurgeNotificationsJob> {
  constructor(private readonly retentionService: RetentionSchedulerService) { }

  async execute(job: Job<PurgeNotificationsJob>, _ctx: JobExecutionContext): Promise<void> {
    await this.retentionService.purgeOldNotifications(job.data.payload.retentionDays);
  }
}
