import type { DefaultJobOptions } from "bullmq";
import { Redis } from "ioredis";
import { BullModule } from "@nestjs/bullmq";
import { DynamicModule, Logger, Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { BaseDynamicModule, DynamicModuleAsyncOptions } from "@ssdev-toolkit/nestjs-core";
import { QueueController } from "./presentation/controllers/queue.controller";
import { QueueFacade } from "./application/services/queue.facade";
import { QueueProcessingService } from "./infrastructure/services/queue-processing.service";
import { QueueProcessorRegistry } from "./infrastructure/services/queue-processor-registry.service";
import { RedisStoreService } from "./infrastructure/redis/redis-store.service";
import { QUEUE_JOB_REDIS_STORE } from "./infrastructure/redis/queue-job.redis-repository";
import { NullQueueJobRepository } from "./infrastructure/redis/null-queue-job.repository";
import { IQueueJobRepository } from "./domain/repositories/queue-job.repository";
// ── CQRS command handlers ──────────────────────────────────────────────────
import { DispatchJobHandler } from "./application/commands/dispatch-job/dispatch-job.handler";
import { RetryJobHandler } from "./application/commands/retry-job/retry-job.handler";
import { RetryAllFailedJobsHandler } from "./application/commands/retry-all-failed-jobs/retry-all-failed-jobs.handler";
import { RemoveJobHandler } from "./application/commands/remove-job/remove-job.handler";
import { PauseQueueHandler } from "./application/commands/pause-queue/pause-queue.handler";
import { ResumeQueueHandler } from "./application/commands/resume-queue/resume-queue.handler";
import { CleanJobsHandler } from "./application/commands/clean-jobs/clean-jobs.handler";
// ── CQRS query handlers ────────────────────────────────────────────────────
import { GetJobDetailsHandler } from "./application/queries/get-job-details/get-job-details.handler";
import { ListJobsHandler } from "./application/queries/list-jobs/list-jobs.handler";
import { SearchJobsHandler } from "./application/queries/search-jobs/search-jobs.handler";
import { GetQueueStatisticsHandler } from "./application/queries/get-queue-statistics/get-queue-statistics.handler";
import {
  QUEUE_OPTIONS,
  QueueModuleInputOptions,
  QueueModuleOptions,
  QueueOptionsSchema,
} from "./queue.schema";

export type { QueueModuleInputOptions, QueueModuleOptions } from "./queue.schema";

const COMMAND_HANDLERS = [
  DispatchJobHandler,
  RetryJobHandler,
  RetryAllFailedJobsHandler,
  RemoveJobHandler,
  PauseQueueHandler,
  ResumeQueueHandler,
  CleanJobsHandler,
];

const QUERY_HANDLERS = [
  GetJobDetailsHandler,
  ListJobsHandler,
  SearchJobsHandler,
  GetQueueStatisticsHandler,
];

function toKeepJobs(
  value: number | { age?: number; count?: number } | undefined,
): DefaultJobOptions["removeOnComplete"] {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value;
  if (value.age !== undefined) {
    return { age: value.age, ...(value.count !== undefined ? { count: value.count } : {}) };
  }
  if (value.count !== undefined) return { age: 0, count: value.count };
  return undefined;
}

function toBullMqDefaultJobOptions(
  options?: QueueModuleOptions["defaultJobOptions"],
): DefaultJobOptions | undefined {
  if (!options) return undefined;
  const mapped: DefaultJobOptions = {
    ...(options.attempts !== undefined ? { attempts: options.attempts } : {}),
    ...(options.removeOnComplete !== undefined ? { removeOnComplete: toKeepJobs(options.removeOnComplete) } : {}),
    ...(options.removeOnFail !== undefined ? { removeOnFail: toKeepJobs(options.removeOnFail) } : {}),
  };
  if (options.backoff) {
    mapped.backoff = { type: options.backoff.type, delay: options.backoff.delay };
  }
  return mapped;
}

/**
 * Create a dedicated Redis client for the job-log store.
 * Uses the same connection parameters as BullMQ but on a separate connection
 * so BullMQ lifecycle events do not interfere with store operations.
 */
function createRedisClient(connection: QueueModuleOptions["connection"]): Redis {
  const logger = new Logger("QueueJobStoreRedis");
  const opts = { maxRetriesPerRequest: 3 as number | null, enableReadyCheck: true };
  const client = connection.url
    ? new Redis(connection.url, opts)
    : new Redis({
      host: connection.host,
      port: connection.port,
      password: connection.password,
      db: connection.db,
      ...opts,
    });
  client.on("error", (err: Error) =>
    logger.error(`QueueJobStore Redis error: ${err?.message ?? err}`),
  );
  return client;
}

// Only the "default" queue is processed. Multi-queue routing is not supported.
const DEFAULT_QUEUE_NAME = "default";
const DEFAULT_FLOW_PRODUCER_NAME = `${DEFAULT_QUEUE_NAME}-flow-producer`;

export interface QueueModuleAsyncOptions
  extends DynamicModuleAsyncOptions<QueueModuleInputOptions> { }

@Module({})
export class QueueModule extends BaseDynamicModule {
  static forRoot(options: QueueModuleInputOptions): DynamicModule {
    const validated = QueueModule.validateOptions(QueueOptionsSchema, options);
    return QueueModule._build(validated, []);
  }

  static forRootAsync(options: QueueModuleAsyncOptions): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        ...(options.imports ?? []),
        CqrsModule,
        BullModule.forRootAsync({
          imports: options.imports ?? [],
          useFactory: async (...args: any[]) => {
            const raw = await options.useFactory(...args);
            const validated = QueueOptionsSchema.parse(raw);
            return {
              connection: validated.connection,
              defaultJobOptions: toBullMqDefaultJobOptions(validated.defaultJobOptions),
            };
          },
          inject: options.inject ?? [],
        }),
        BullModule.registerQueue({ name: DEFAULT_QUEUE_NAME }),
        BullModule.registerFlowProducer({ name: DEFAULT_FLOW_PRODUCER_NAME }),
      ],
      providers: [
        {
          provide: QUEUE_OPTIONS,
          useFactory: async (...args: any[]) => {
            const raw = await options.useFactory(...args);
            return QueueOptionsSchema.parse(raw);
          },
          inject: options.inject ?? [],
        },
        {
          provide: QUEUE_JOB_REDIS_STORE,
          useFactory: async (opts: QueueModuleOptions) =>
            new RedisStoreService(createRedisClient(opts.connection)),
          inject: [QUEUE_OPTIONS],
        },
        { provide: IQueueJobRepository, useClass: NullQueueJobRepository },
        QueueProcessingService,
        QueueProcessorRegistry,
        QueueFacade,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
      ],
      exports: [QueueFacade, QueueProcessingService, IQueueJobRepository, QUEUE_JOB_REDIS_STORE],
      controllers: [QueueController],
    };
  }

  private static _build(
    validated: QueueModuleOptions,
    extraImports: any[],
  ): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        ...extraImports,
        CqrsModule,
        BullModule.forRoot({
          connection: validated.connection,
          defaultJobOptions: toBullMqDefaultJobOptions(validated.defaultJobOptions),
        }),
        BullModule.registerQueue({ name: DEFAULT_QUEUE_NAME }),
        BullModule.registerFlowProducer({ name: DEFAULT_FLOW_PRODUCER_NAME }),
      ],
      providers: [
        { provide: QUEUE_OPTIONS, useValue: validated },
        {
          provide: QUEUE_JOB_REDIS_STORE,
          useFactory: () => new RedisStoreService(createRedisClient(validated.connection)),
        },
        { provide: IQueueJobRepository, useClass: NullQueueJobRepository },
        QueueProcessingService,
        QueueProcessorRegistry,
        QueueFacade,
        ...COMMAND_HANDLERS,
        ...QUERY_HANDLERS,
      ],
      exports: [QueueFacade, QueueProcessingService, IQueueJobRepository, QUEUE_JOB_REDIS_STORE],
      controllers: [QueueController],
    };
  }
}
