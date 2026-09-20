import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { RetryAllFailedJobsCommand } from './retry-all-failed-jobs.command';

export interface RetryAllResult {
  retriedCount: number;
  failedCount: number;
}

@CommandHandler(RetryAllFailedJobsCommand)
@Injectable()
export class RetryAllFailedJobsHandler
  implements ICommandHandler<RetryAllFailedJobsCommand, RetryAllResult>
{
  private readonly logger = new Logger(RetryAllFailedJobsHandler.name);

  constructor(private readonly processing: QueueProcessingService) {}

  async execute(): Promise<RetryAllResult> {
    // Safety limit: fetch at most 1000 failed jobs per call
    const { jobs: failedJobs } = await this.processing.getJobs(0, 1000, 'failed');
    let retriedCount = 0;
    let failedCount  = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        failedCount++;
        this.logger.error(
          `Failed to retry job ${job.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { retriedCount, failedCount };
  }
}
