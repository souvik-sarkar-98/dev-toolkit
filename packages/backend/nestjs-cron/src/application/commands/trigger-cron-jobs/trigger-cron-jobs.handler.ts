import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CRON_JOB_QUEUE_PORT, ICronJobQueuePort } from '../../../domain/ports/cron-job-queue.port';
import { CronSchedulePolicy } from '../../../domain/policies/cron-schedule.policy';
import { InvalidTriggerTimestampError } from '../../../domain/errors/cron.errors';
import { CRON2_OPTIONS } from '../../../infrastructure/cron-options.token';
import { Cron2ModuleOptions } from '../../../cron.schema';
import { TriggerCronJobsCommand } from './trigger-cron-jobs.command';
import { TriggerResultDto, EnqueuedJobDto, SkippedJobDto } from '../../dtos/cron.dtos';

@CommandHandler(TriggerCronJobsCommand)
@Injectable()
export class TriggerCronJobsHandler
  implements ICommandHandler<TriggerCronJobsCommand, TriggerResultDto>
{
  private readonly logger = new Logger(TriggerCronJobsHandler.name);

  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
    @Optional() @Inject(CRON_JOB_QUEUE_PORT) private readonly jobQueue: ICronJobQueuePort,
    @Inject(CRON2_OPTIONS) private readonly options: Cron2ModuleOptions,
  ) {}

  async execute(command: TriggerCronJobsCommand): Promise<TriggerResultDto> {
    const now = command.timestamp ? new Date(command.timestamp) : new Date();

    // MEDIUM-2: Guard against invalid timestamp strings — new Date('bad') yields Invalid Date
    // whose getTime() is NaN, silently breaking all schedule evaluations.
    if (command.timestamp && isNaN(now.getTime())) {
      throw new InvalidTriggerTimestampError(
        `Trigger timestamp "${command.timestamp}" is not a valid ISO date`,
      );
    }

    const timezone = this.options.timezone ?? 'UTC';

    this.logger.log(
      `[cron] Evaluating jobs. Trigger: ${now.toISOString()} (${timezone})`,
    );

    const jobs = await this.jobStore.findAll();
    const enqueuedJobs: EnqueuedJobDto[] = [];
    const skippedJobs: SkippedJobDto[] = [];

    for (const job of jobs) {
      if (!job.enabled) {
        this.logger.debug(`[cron] Skipped "${job.name}": DISABLED`);
        skippedJobs.push({ jobName: job.name, reason: 'DISABLED' });
        continue;
      }

      const { due, scheduledAt, error } = CronSchedulePolicy.shouldExecute(
        job.expression,
        now,
        timezone,
      );

      if (!due) {
        if (error) {
          // MEDIUM-1: Surface schedule parse/evaluation errors instead of silently skipping.
          this.logger.warn(
            `[cron] Skipped "${job.name}": SCHEDULE_ERROR — expression "${job.expression}" failed: ${error}`,
          );
          skippedJobs.push({ jobName: job.name, reason: 'SCHEDULE_ERROR' });
        } else {
          this.logger.debug(`[cron] Skipped "${job.name}": SCHEDULE_NOT_MATCHED`);
          skippedJobs.push({ jobName: job.name, reason: 'SCHEDULE_NOT_MATCHED' });
        }
        continue;
      }

      for (const occurrence of scheduledAt ?? []) {
        const enqueueResult = await this.jobQueue.enqueue(
          job.name,
          job.handler,
          job.inputData,
          occurrence,
        );
        this.logger.log(
          `[cron] Enqueued "${job.name}" (scheduled at ${occurrence.toISOString()}) as BullMQ job ${enqueueResult.id}`,
        );
        enqueuedJobs.push({ jobName: job.name, queueJobId: enqueueResult.id });
      }
    }

    return { enqueuedJobs, skippedJobs };
  }
}
