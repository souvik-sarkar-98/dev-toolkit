import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CRON_JOB_QUEUE_PORT, ICronJobQueuePort } from '../../../domain/ports/cron-job-queue.port';
import { CronJobNotFoundError } from '../../../domain/errors/cron.errors';
import { RunCronJobCommand } from './run-cron-job.command';

@CommandHandler(RunCronJobCommand)
@Injectable()
export class RunCronJobHandler
  implements ICommandHandler<RunCronJobCommand, { id: string }>
{
  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
    @Optional() @Inject(CRON_JOB_QUEUE_PORT) private readonly jobQueue: ICronJobQueuePort,
  ) {}

  async execute(command: RunCronJobCommand): Promise<{ id: string }> {
    const job = await this.jobStore.findByName(command.name);
    if (!job) throw new CronJobNotFoundError(command.name);

    const payload = command.inputData ?? job.inputData;
    return this.jobQueue.enqueue(job.name, job.handler, payload, new Date());
  }
}
