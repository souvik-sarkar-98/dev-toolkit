import { Job } from 'bullmq';
import { QueueJob } from '../../domain/aggregates/queue-job.aggregate';
import { JobDetail } from '../../presentation/dto/queue.dto';
import { QueueJobSearchResultDto } from '../dtos/queue-job.dtos';

export class QueueJobResponseMapper {
  private static publicFailureReason(reason?: string): string {
    return reason ? 'Job processing failed.' : '';
  }

  static async toJobDetail(job: Job<any, any, string>, _logs?: string[]): Promise<JobDetail> {
    return {
      id:           job.id,
      name:         job.name,
      data:         job.data,
      opts:         job.opts,
      state:        await job.getState(),
      progress:     job.progress ?? 0,
      returnvalue:  job.returnvalue,
      failedReason: this.publicFailureReason(job.failedReason),
      processedOn:  job.processedOn  ? new Date(job.processedOn)  : undefined,
      finishedOn:   job.finishedOn   ? new Date(job.finishedOn)   : undefined,
      timestamp:    job.timestamp    ? new Date(job.timestamp)    : undefined,
      attemptsMade: job.attemptsMade,
      delay:        job.delay,
      stacktrace:   [],
      logs:         [],
    };
  }

  static toSearchResult(queueJob: QueueJob): QueueJobSearchResultDto {
    const dto = new QueueJobSearchResultDto();
    dto.id           = queueJob.id;
    dto.jobName      = queueJob.jobName;
    dto.queueName    = queueJob.queueName;
    dto.status       = queueJob.status;
    dto.payload      = queueJob.payload;
    dto.failedReason = this.publicFailureReason(queueJob.failedReason) || undefined;
    dto.attemptsMade = queueJob.attemptsMade;
    dto.enqueuedAt   = queueJob.enqueuedAt;
    dto.startedAt    = queueJob.startedAt;
    dto.finishedAt   = queueJob.finishedAt;
    return dto;
  }
}
