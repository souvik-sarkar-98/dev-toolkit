import { CronJob } from '../models/cron-job.model';

export const CRON_JOB_STORE_PORT = Symbol('ICronJobStorePort');

export interface ICronJobStorePort {
  findAll(): Promise<CronJob[]>;
  findByName(name: string): Promise<CronJob | null>;
  upsert(job: CronJob): Promise<CronJob>;
  delete(name: string): Promise<void>;
}
