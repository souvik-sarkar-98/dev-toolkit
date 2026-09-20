import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { JobType, Queue } from "bullmq";
import { Job, JobOptions } from "../../presentation/dto/queue.dto";

/**
 * Infrastructure-layer BullMQ driver.
 *
 * This is the only class in the module that holds a reference to the BullMQ
 * `Queue` instance. Every method is a thin, 1-to-1 mapping to a BullMQ Queue
 * API call — no pagination, no DTO mapping, no business rules.
 *
 * Consumers inside this module:
 *   - `QueueBus`              — calls addJob() to enqueue typed job instances
 *   - `QueueManagementService` — calls all other methods for monitoring/control
 *
 * Never inject this service outside of `src/queue/` — use `QueueBus` instead.
 */
const DEFAULT_QUEUE_NAME = "default";

export const REMOVE_ON_COMPLETE = { age: 24 * 60 * 60, count: 1000 };
export const REMOVE_ON_FAIL = { age: 7 * 24 * 60 * 60, count: 1000 };

@Injectable()
export class QueueProcessingService {
  private readonly logger = new Logger(QueueProcessingService.name);

  constructor(
    @InjectQueue(DEFAULT_QUEUE_NAME)
    private readonly defaultQueue: Queue,
  ) {}

  async addJob<T>(
    name: string,
    data: T,
    options?: JobOptions,
  ): Promise<Job<T>> {
    try {
      this.logger.log(`Adding job: ${name}`);
      const jobOptions = this.applyTTL(options);
      const job = await this.defaultQueue.add(name, data, jobOptions);
      this.logger.log(`Job added: ${job.id}`);
      return job as Job<T>;
    } catch (error) {
      this.logger.error(`Failed to add job: ${name}`, error);
      throw error;
    }
  }

  async getJob<T>(jobId: string): Promise<Job<T> | undefined> {
    try {
      const job = await this.defaultQueue.getJob(jobId);
      return job as Job<T> | undefined;
    } catch (error) {
      this.logger.error(`Failed to get job: ${jobId}`, error);
      throw error;
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.defaultQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Job removed: ${jobId}`);
      } else {
        this.logger.warn(`Job not found: ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove job: ${jobId}`, error);
      throw error;
    }
  }

  async retryJob(jobId: string): Promise<void> {
    try {
      const job = await this.defaultQueue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      const state = await job.getState();
      if (state !== "failed") {
        throw new Error(
          `Job ${jobId} is not in failed state. Current state: ${state}`,
        );
      }
      await job.retry();
      this.logger.log(`Job ${jobId} queued for retry`);
    } catch (error) {
      this.logger.error(`Failed to retry job: ${jobId}`, error);
      throw error;
    }
  }

  async cleanJobs(): Promise<{ completed: string[]; failed: string[] }> {
    try {
      const completedJobs = await this.defaultQueue.clean(
        REMOVE_ON_COMPLETE.age * 1000,
        REMOVE_ON_COMPLETE.count,
        "completed",
      );
      const failedJobs = await this.defaultQueue.clean(
        REMOVE_ON_FAIL.age * 1000,
        REMOVE_ON_FAIL.count,
        "failed",
      );
      this.logger.log("Cleaned completed and failed jobs");
      return { completed: completedJobs, failed: failedJobs };
    } catch (error) {
      this.logger.error("Failed to clean jobs", error);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    try {
      await this.defaultQueue.pause();
      this.logger.log("Queue paused");
    } catch (error) {
      this.logger.error("Failed to pause queue", error);
      throw error;
    }
  }

  async resumeQueue(): Promise<void> {
    try {
      await this.defaultQueue.resume();
      this.logger.log("Queue resumed");
    } catch (error) {
      this.logger.error("Failed to resume queue", error);
      throw error;
    }
  }

  async isQueuePaused(): Promise<boolean> {
    try {
      return await this.defaultQueue.isPaused();
    } catch (error) {
      this.logger.error("Failed to check queue pause status", error);
      throw error;
    }
  }

  async getJobs(
    start: number,
    end: number,
    status?: JobType,
    jobId?: string,
  ): Promise<{ jobs: Job<any>[]; count: number }> {
    try {
      if (jobId) {
        const job = await this.defaultQueue.getJob(jobId);
        return { jobs: job ? [job as Job<any>] : [], count: job ? 1 : 0 };
      }
      const jobs = await this.defaultQueue.getJobs(status, start, end);
      if (status) {
        const count = await this.defaultQueue.getJobCounts(status);
        return { jobs: jobs as Job<any>[], count: count[status] };
      }
      const count = await this.defaultQueue.getJobCounts();
      const totalCount = Object.values(count).reduce((acc, n) => acc + n, 0);
      return { jobs: jobs as Job<any>[], count: totalCount };
    } catch (error) {
      this.logger.error(`Failed to get jobs`, error);
      throw error;
    }
  }

  async getJobLogs(
    jobId: string,
  ): Promise<{ logs: string[]; count: number }> {
    try {
      return await this.defaultQueue.getJobLogs(jobId);
    } catch (error) {
      this.logger.error(`Failed to get logs for job: ${jobId}`, error);
      throw error;
    }
  }

  async getJobCounts() {
    try {
      return await this.defaultQueue.getJobCounts();
    } catch (error) {
      this.logger.error("Failed to get job counts", error);
      throw error;
    }
  }

  private applyTTL(options?: JobOptions): JobOptions {
    return {
      ...options,
      removeOnComplete: options?.removeOnComplete ?? REMOVE_ON_COMPLETE,
      removeOnFail: options?.removeOnFail ?? REMOVE_ON_FAIL,
    };
  }
}
