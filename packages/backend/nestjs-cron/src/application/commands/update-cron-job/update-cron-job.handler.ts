import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronExpression } from '../../../domain/value-objects/cron-expression.vo';
import { CronJobNotFoundError } from '../../../domain/errors/cron.errors';
import { CronJob } from '../../../domain/models/cron-job.model';
import { UpdateCronJobCommand } from './update-cron-job.command';

@CommandHandler(UpdateCronJobCommand)
@Injectable()
export class UpdateCronJobHandler
  implements ICommandHandler<UpdateCronJobCommand, CronJob>
{
  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
  ) {}

  async execute(command: UpdateCronJobCommand): Promise<CronJob> {
    const existing = await this.jobStore.findByName(command.name);
    if (!existing) throw new CronJobNotFoundError(command.name);

    if (command.patch.expression) {
      CronExpression.of(command.patch.expression);
    }

    return this.jobStore.upsert({ ...existing, ...command.patch, name: command.name });
  }
}
