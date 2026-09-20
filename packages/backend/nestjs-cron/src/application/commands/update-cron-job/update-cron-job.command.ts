import { CronJob } from '../../../domain/models/cron-job.model';

export class UpdateCronJobCommand {
  constructor(
    readonly name: string,
    readonly patch: Partial<Omit<CronJob, 'name'>>,
  ) {}
}
