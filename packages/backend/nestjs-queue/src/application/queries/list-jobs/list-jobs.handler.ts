import { Injectable, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '@ssdev-toolkit/nestjs-core';
import { QueueProcessingService } from '../../../infrastructure/services/queue-processing.service';
import { QueueJobResponseMapper } from '../../mappers/queue-job-response.mapper';
import { JobDetail } from '../../../presentation/dto/queue.dto';
import { ListJobsQuery } from './list-jobs.query';

@QueryHandler(ListJobsQuery)
@Injectable()
export class ListJobsHandler implements IQueryHandler<ListJobsQuery, Page<JobDetail>> {
  private readonly logger = new Logger(ListJobsHandler.name);

  constructor(private readonly processing: QueueProcessingService) { }

  async execute({ params }: ListJobsQuery): Promise<Page<JobDetail>> {
    const page = params.pageIndex ?? 0;
    const size = params.pageSize ?? 10;
    const start = page * size;
    const end = start + size - 1;

    const { jobs, count } = await this.processing.getJobs(start, end, params.status, params.jobId);

    const jobDetails = (
      await Promise.all(jobs.map(job => QueueJobResponseMapper.toJobDetail(job as any)))
    ).sort((a, b) => {
      if (a.state === 'completed' && b.state !== 'completed') return 1;
      if (a.state !== 'completed' && b.state === 'completed') return -1;
      return 0;
    });

    return new Page(jobDetails, count, page, size);
  }
}
