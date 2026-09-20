import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { QueueJobResponseMapper } from '../../mappers/queue-job-response.mapper';
import { JobDetail } from '../../../presentation/dto/queue.dto';
import { GetJobDetailsQuery } from './get-job-details.query';

@QueryHandler(GetJobDetailsQuery)
@Injectable()
export class GetJobDetailsHandler
  implements IQueryHandler<GetJobDetailsQuery, JobDetail> {
  constructor(private readonly processing: QueueProcessingService) { }

  async execute({ jobId }: GetJobDetailsQuery): Promise<JobDetail> {
    const job = await this.processing.getJob(jobId);
    if (!job) throw new BusinessError(`Job not found with id ${jobId}`, 'JOB_NOT_FOUND', 404);
    const { logs } = await this.processing.getJobLogs(jobId);
    return QueueJobResponseMapper.toJobDetail(job as any, logs);
  }
}
