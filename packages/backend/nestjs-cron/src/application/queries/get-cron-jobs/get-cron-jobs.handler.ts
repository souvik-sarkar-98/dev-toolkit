import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import cronstrue from 'cronstrue';
import { CRON_JOB_STORE_PORT, ICronJobStorePort } from '../../../domain/ports/cron-job-store.port';
import { CronSchedulePolicy } from '../../../domain/policies/cron-schedule.policy';
import { normalizeToQuartz } from '../../../domain/value-objects/cron-expression.vo';
import { CRON2_OPTIONS } from '../../../infrastructure/cron-options.token';
import { Cron2ModuleOptions } from '../../../cron.schema';
import { CronJobDto } from '../../dtos/cron.dtos';
import { GetCronJobsQuery } from './get-cron-jobs.query';

@QueryHandler(GetCronJobsQuery)
@Injectable()
export class GetCronJobsHandler
  implements IQueryHandler<GetCronJobsQuery, CronJobDto[]>
{
  constructor(
    @Optional() @Inject(CRON_JOB_STORE_PORT) private readonly jobStore: ICronJobStorePort,
    @Inject(CRON2_OPTIONS) private readonly options: Cron2ModuleOptions,
  ) {}

  async execute(): Promise<CronJobDto[]> {
    const jobs = await this.jobStore.findAll();
    const timezone = this.options.timezone ?? 'UTC';
    const now = new Date();

    return jobs.map((job) => {
      let readableExpression = job.expression;
      let nextRun: Date | undefined;

      try {
        readableExpression = cronstrue.toString(normalizeToQuartz(job.expression));
      } catch {
        // keep raw expression if formatting fails
      }

      if (job.enabled) {
        try {
          nextRun = CronSchedulePolicy.calculateNextRun(job.expression, now, timezone);
        } catch {
          // leave undefined on parse error
        }
      }

      return {
        name: job.name,
        description: job.description,
        expression: job.expression,
        readableExpression,
        handler: job.handler,
        enabled: job.enabled,
        nextRun,
        inputData: job.inputData,
      };
    });
  }
}
