import { QueueHandler, IQueueHandler, Job, JobExecutionContext } from '@ssdev-toolkit/nestjs-queue';
import { PurgeSubscriptionsJob } from '../../application/jobs/retention.jobs';
import { RetentionSchedulerService } from '../../application/retention/retention-scheduler.service';

@QueueHandler(PurgeSubscriptionsJob, { attempts: 1 })
export class PurgeSubscriptionsHandler implements IQueueHandler<PurgeSubscriptionsJob> {
  constructor(private readonly retentionService: RetentionSchedulerService) { }

  async execute(job: Job<PurgeSubscriptionsJob>, _ctx: JobExecutionContext): Promise<void> {
    await this.retentionService.purgeInactiveSubscriptions(job.data.payload.retentionDays);
  }
}
