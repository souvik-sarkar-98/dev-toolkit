import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { QueueJob } from '../aggregates/queue-job.aggregate';
import { JobStatus } from '../enums/job-status.enum';

export interface QueueJobFilter {
  jobName?: string;
  queueName?: string;
  status?: JobStatus;
}

export const IQueueJobRepository = Symbol('IQueueJobRepository');

export interface IQueueJobRepository
  extends IRepository<QueueJob, string, QueueJobFilter> { }
