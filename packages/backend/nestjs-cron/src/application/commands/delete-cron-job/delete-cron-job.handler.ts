import { Inject, Injectable, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronJobNotFoundError } from '../../../domain/errors/cron.errors';
import { DeleteCronJobCommand } from './delete-cron-job.command';

@CommandHandler(DeleteCronJobCommand)
@Injectable()
export class DeleteCronJobHandler implements ICommandHandler<DeleteCronJobCommand, void> {
  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
  ) {}

  async execute(command: DeleteCronJobCommand): Promise<void> {
    const existing = await this.jobStore.findByName(command.name);
    if (!existing) throw new CronJobNotFoundError(command.name);
    await this.jobStore.delete(command.name);
  }
}
