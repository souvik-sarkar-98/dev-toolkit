// ── Module registration (app-level) ──────────────────────────────────────────
export { QueueModule } from "./queue.module";
export type { QueueModuleAsyncOptions, QueueModuleOptions } from "./queue.module";
export { QueueOptionsSchema } from "./queue.schema";

// ── Dispatching jobs ──────────────────────────────────────────────────────────
export { QueueFacade } from "./application/services/queue.facade";
export { QueueProcessingService } from "./infrastructure/services/queue-processing.service";
export type { JobOptions } from "./presentation/dto/queue.dto";

// ── Job log storage — **host persistence / optional secondary store** ─────────
// Dispatch jobs via QueueFacade; do not inject IQueueJobRepository from feature modules.
export { QueueJob } from "./domain/aggregates/queue-job.aggregate";
export { JobStatus } from "./domain/enums/job-status.enum";
export { IQueueJobRepository } from "./domain/repositories/queue-job.repository";
export type { QueueJobFilter } from "./domain/repositories/queue-job.repository";
export { QueueJobRedisRepository, QUEUE_JOB_REDIS_STORE } from "./infrastructure/redis/queue-job.redis-repository";
export { NullQueueJobRepository } from "./infrastructure/redis/null-queue-job.repository";
export { QueueJobSearchResultDto } from "./application/dtos/queue-job.dtos";

// ── Implementing handlers ─────────────────────────────────────────────────────
export { QueueHandler } from "./application/decorators/queue-handler.decorator";
export type { QueueHandlerOptions } from "./application/decorators/queue-handler.decorator";
export type { IQueueHandler } from "./application/interfaces/queue-handler.interface";
export type { Job, JobExecutionContext } from "./presentation/dto/queue.dto";
// QUEUE_HANDLER_METADATA — internal symbol, consumers use @QueueHandler
// JobProcessor — internal type alias, consumers implement IQueueHandler

// ── Error hierarchy (throw from execute(), check retryability) ────────────────
export {
  JobError,
  TransientJobError,
  PermanentJobError,
  NetworkJobError,
  DatabaseJobError,
  ValidationJobError,
  ExternalServiceJobError,
  RateLimitJobError,
  TimeoutJobError,
  BusinessLogicJobError,
  ResourceNotFoundJobError,
  InsufficientResourcesJobError,
  isRetryableError,
} from "./domain/errors/queue.errors";
// categorizeError, getRetryDelay — internal worker utilities, not for consumers
