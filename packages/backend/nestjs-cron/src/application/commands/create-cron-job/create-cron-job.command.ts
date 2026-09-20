import { CronJob } from '../../../domain/models/cron-job.model';

export class CreateCronJobCommand {
  constructor(readonly job: CronJob) {}
}
