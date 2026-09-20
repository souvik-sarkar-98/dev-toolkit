import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronExpression } from '../../../domain/value-objects/cron-expression.vo';
import { CronJobAlreadyExistsError } from '../../../domain/errors/cron.errors';
import { CronJob } from '../../../domain/models/cron-job.model';
import { CreateCronJobCommand } from './create-cron-job.command';

@CommandHandler(CreateCronJobCommand)
@Injectable()
export class CreateCronJobHandler
  implements ICommandHandler<CreateCronJobCommand, CronJob>
{
  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
  ) {}

  async execute(command: CreateCronJobCommand): Promise<CronJob> {
    // LOW-1: Validate expression before the existence check so expression errors are
    // reported immediately without an unnecessary store lookup.
    CronExpression.of(command.job.expression);

    // LOW-1: POST /cron/jobs is a strict CREATE — reject if the job already exists.
    // Use PUT /cron/jobs/:name to update an existing job.
    const existing = await this.jobStore.findByName(command.job.name);
    if (existing) {
      throw new CronJobAlreadyExistsError(command.job.name);
    }

    return this.jobStore.upsert(command.job);
  }
}
