// ── Module ────────────────────────────────────────────────────────────────────
export { Cron2Module as CronModule } from './cron.module';
export type { Cron2ModuleOptions as CronModuleOptions, Cron2ModuleAsyncOptions as CronModuleAsyncOptions } from './cron.module';

// ── Domain — models ───────────────────────────────────────────────────────────
export type { CronJob } from './domain/models/cron-job.model';

// ── Domain — value objects ────────────────────────────────────────────────────
export { CronExpression, normalizeToQuartz } from './domain/value-objects/cron-expression.vo';

// ── Domain — errors ───────────────────────────────────────────────────────────
export { InvalidCronExpressionError, CronJobNotFoundError } from './domain/errors/cron.errors';

// ── Domain — ports (consumers may implement custom adapters) ──────────────────
export { CRON_JOB_STORE_PORT } from './domain/ports/cron-job-store.port';
export type { ICronJobStorePort } from './domain/ports/cron-job-store.port';
export { CRON_JOB_QUEUE_PORT } from './domain/ports/cron-job-queue.port';
export type { ICronJobQueuePort } from './domain/ports/cron-job-queue.port';

// ── Application — DTOs ────────────────────────────────────────────────────────
export { CronJobDto, TriggerResultDto, EnqueuedJobDto, SkippedJobDto } from './application/dtos/cron.dtos';

// ── JSON-store payload schemas ────────────────────────────────────────────────
export { CronJobPayloadSchema, type CronJobPayload } from './cron-job-payload.schema';
