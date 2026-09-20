import { InjectQueue } from "@nestjs/bullmq";
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core/injector/modules-container";
import { EventBus } from "@nestjs/cqrs";
import { Job as BullJob, Queue, UnrecoverableError, WaitingChildrenError, Worker } from "bullmq";
import { AppTechnicalError } from "@ssdev-toolkit/nestjs-core";
import {
  QUEUE_HANDLER_METADATA,
  QueueHandlerOptions,
} from "../../application/decorators/queue-handler.decorator";
import { Job, JobExecutionContext, JobOptions } from "../../presentation/dto/queue.dto";
import { IQueueHandler } from "../../application/interfaces/queue-handler.interface";
import { QUEUE_OPTIONS, QueueModuleOptions } from "../../queue.schema";
import { REMOVE_ON_COMPLETE, REMOVE_ON_FAIL } from "./queue-processing.service";
import {
  categorizeError,
  getRetryDelay,
  isRetryableError,
  RateLimitJobError,
} from "../../domain/errors/queue.errors";
import { IQueueJobRepository } from "../../domain/repositories/queue-job.repository";

const DEFAULT_QUEUE_NAME = "default";

@Injectable()
export class QueueProcessorRegistry
  implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(QueueProcessorRegistry.name);
  private readonly handlers = new Map<
    string,
    { handler: IQueueHandler; options: QueueHandlerOptions }
  >();
  private worker: Worker | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectQueue(DEFAULT_QUEUE_NAME)
    private readonly defaultQueue: Queue,
    private readonly modulesContainer: ModulesContainer,
    private readonly eventBus: EventBus,
    @Inject(QUEUE_OPTIONS)
    private readonly options: QueueModuleOptions,
    @Inject(IQueueJobRepository)
    private readonly jobRepo: IQueueJobRepository,
  ) { }

  async onApplicationBootstrap() {
    this.discoverHandlers();
    await this.initializeWorker();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    await this.shutdown();
  }

  getHandlerOptions(jobName: string): QueueHandlerOptions | undefined {
    return this.handlers.get(jobName)?.options;
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  isHandlerRegistered(jobName: string): boolean {
    return this.handlers.has(jobName);
  }

  async getMetrics() {
    if (!this.worker) {
      return {
        isRunning: false,
        totalHandlers: this.handlers.size,
        handlers: this.getRegisteredHandlers(),
      };
    }
    return {
      isRunning: this.worker.isRunning(),
      isPaused: this.worker.isPaused(),
      totalHandlers: this.handlers.size,
      handlers: this.getRegisteredHandlers(),
    };
  }

  private discoverHandlers() {
    const startTime = Date.now();
    let found = 0;

    this.logger.log(
      `Starting handler discovery... (${this.modulesContainer.size} modules)`,
    );

    for (const module of this.modulesContainer.values()) {
      for (const wrapper of module.providers.values()) {
        if (!wrapper?.instance || typeof wrapper.instance !== "object")
          continue;

        const meta = Reflect.getMetadata(
          QUEUE_HANDLER_METADATA,
          wrapper.instance.constructor,
        );

        if (meta) {
          const jobName: string = meta.jobClass.name;
          this.logger.log(
            `Found handler: ${jobName} → ${wrapper.instance.constructor.name}`,
          );
          this.handlers.set(jobName, {
            handler: wrapper.instance as IQueueHandler,
            options: meta.options,
          });
          found++;
        }
      }
    }

    this.logger.log(
      `Discovered ${found} handler(s) in ${Date.now() - startTime}ms`,
    );

    if (found === 0) {
      this.logger.warn(
        "No handlers found. Ensure @QueueHandler classes are in a module's providers array.",
      );
    }
  }

  private async initializeWorker() {
    if (this.worker) return;

    this.worker = new Worker(
      DEFAULT_QUEUE_NAME,
      async (job: BullJob, token?: string) => this.processJob(job, token),
      {
        connection: this.defaultQueue.opts.connection,
        concurrency: this.options.concurrency,
        lockDuration: 30000,
        stalledInterval: 60000,
        maxStalledCount: 2,
        removeOnComplete: REMOVE_ON_COMPLETE,
        removeOnFail: REMOVE_ON_FAIL,
      },
    );

    this.worker.on("completed", (job) => {
      this.logger.log(`Completed: ${job.name}:${job.id}`);
      if (job.id) this.updateJobLog(job.id, 'completed');
    });

    this.worker.on("failed", (job, error) => {
      this.logger.error(`Failed: ${job?.name}:${job?.id} — ${error.message}`);
      if (job?.id) this.updateJobLog(job.id, 'failed', error.message, job.attemptsMade);
    });

    this.worker.on("active", (job) => {
      if (job.id) this.updateJobLog(job.id, 'active');
    });

    this.worker.on("error", (error) => {
      this.logger.error(`Worker error: ${error.message}`);
    });

    this.logger.log(
      `Worker initialized (concurrency=${this.options.concurrency})`,
    );
  }

  private updateJobLog(
    jobId: string,
    lifecycle: 'active' | 'completed' | 'failed',
    failedReason?: string,
    attemptsMade?: number,
  ): void {
    void this.jobRepo.findById(jobId).then(job => {
      if (!job) return;
      if (lifecycle === 'active') job.markActive();
      if (lifecycle === 'completed') job.markCompleted();
      if (lifecycle === 'failed') job.markFailed(failedReason ?? 'unknown', attemptsMade ?? 1);

      return this.jobRepo.update(jobId, job).then(() => {
        const events = [...job.domainEvents];
        job.clearEvents();
        this.eventBus.publishAll(events);
      });
    }).catch(err => {
      this.logger.warn(`job log update failed for ${jobId}: ${err?.message}`);
    });
  }

  private async processJob(job: BullJob, token?: string): Promise<any> {
    if (this.isShuttingDown) {
      throw new Error("Worker is shutting down");
    }

    // Auto-complete parent jobs that awaken after waiting for children
    if (job.data._internal_isWaitingOnChildren) {
      this.logger.log(
        `Job ${job.id} resumed after waiting for children — auto-completing.`,
      );
      const cleanData = { ...job.data };
      delete cleanData._internal_isWaitingOnChildren;
      await job.updateData(cleanData);
      return;
    }

    const entry = this.handlers.get(job.name);
    if (!entry) {
      this.logger.warn(`No handler registered for: ${job.name}`);
      throw new UnrecoverableError(`No handler registered for job type: ${job.name}`);
    }

    const { handler, options } = entry;
    const startTime = Date.now();
    const attemptNumber = (job.attemptsMade || 0) + 1;
    const maxAttempts = job.opts.attempts || 3;

    const childrenToSpawn: { name: string; data: any; options?: JobOptions }[] = [];

    const ctx: JobExecutionContext = {
      addChildJob: <T = any>(
        name: string,
        data: T,
        childOptions?: JobOptions,
      ): string => {
        const jobId =
          childOptions?.jobId || `${job.id}-C${childrenToSpawn.length}`;
        childrenToSpawn.push({ name, data, options: { ...childOptions, jobId } });
        return jobId;
      },
    };

    try {
      job.log(
        `Starting: ${job.name}:${job.id} (attempt ${attemptNumber}/${maxAttempts})`,
      );

      let result: any;
      if (options.timeout) {
        result = await this.executeWithTimeout(
          handler.execute(job as unknown as Job, ctx),
          options.timeout,
          job.name,
        );
      } else {
        result = await handler.execute(job as unknown as Job, ctx);
      }

      const duration = Date.now() - startTime;
      job.log(`Completed: ${job.name}:${job.id} in ${duration}ms`);

      if (childrenToSpawn.length > 0) {
        this.logger.log(
          `Job ${job.id} spawning ${childrenToSpawn.length} child job(s).`,
        );

        await job.updateData({
          ...job.data,
          _internal_isWaitingOnChildren: true,
        });

        for (const child of childrenToSpawn) {
          const childOpts = {
            ...child.options,
            parent: {
              id: job.id!,
              queue:
                job.queueQualifiedName ||
                (await this.defaultQueue
                  .waitUntilReady()
                  .then(() => this.defaultQueue.qualifiedName)),
            },
          };
          await this.defaultQueue.add(child.name, child.data, childOpts);
        }

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          throw new WaitingChildrenError();
        } else {
          const cleanData = { ...job.data };
          delete cleanData._internal_isWaitingOnChildren;
          await job.updateData(cleanData);
        }
      }

      return result;
    } catch (error) {
      if (error instanceof WaitingChildrenError) throw error;

      const categorized = categorizeError(
        error instanceof Error ? error : new Error(String(error)),
      );
      const retryDelay = getRetryDelay(categorized, attemptNumber);

      const duration = Date.now() - startTime;
      job.log(
        `Failed: ${job.name}:${job.id} after ${duration}ms — attempt ${attemptNumber}: ${categorized.message}`,
      );

      if (categorized instanceof RateLimitJobError && categorized.retryAfter) {
        this.logger.warn(
          `Job ${job.name}:${job.id} hit rate limit — suggested retry delay: ${categorized.retryAfter}ms` +
          ` (BullMQ will apply configured backoff: ~${retryDelay}ms)`,
        );
      } else {
        this.logger.debug(
          `Job ${job.name}:${job.id} next retry delay: ~${retryDelay}ms`,
        );
      }

      this.eventBus.publish(new AppTechnicalError(categorized));

      if (options.onRetry && attemptNumber < maxAttempts) {
        try {
          await options.onRetry(attemptNumber, categorized);
        } catch (hookErr) {
          this.logger.warn(`onRetry hook failed for ${job.name}`, hookErr);
        }
      }
      if (options.onFailed && attemptNumber >= maxAttempts) {
        try {
          await options.onFailed(categorized, attemptNumber);
        } catch (hookErr) {
          this.logger.warn(`onFailed hook failed for ${job.name}`, hookErr);
        }
      }

      if (!isRetryableError(categorized)) {
        throw new UnrecoverableError(categorized.message);
      }
      throw categorized;
    }
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    jobName: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => {
          this.logger.warn(
            `Job ${jobName} timed out after ${timeoutMs}ms — original execution may still be running`,
          );
          reject(new Error(`Job ${jobName} timed out after ${timeoutMs}ms`));
        }, timeoutMs),
      ),
    ]);
  }

  private async shutdown() {
    this.logger.log("Shutting down worker...");
    if (this.worker) {
      try {
        await Promise.race([
          this.worker.close(),
          new Promise((resolve) => setTimeout(resolve, 30000)),
        ]);
        this.logger.log("Worker closed gracefully");
      } catch (error) {
        this.logger.error("Error closing worker:", error);
      }
      this.worker = null;
    }
    this.handlers.clear();
  }
}
