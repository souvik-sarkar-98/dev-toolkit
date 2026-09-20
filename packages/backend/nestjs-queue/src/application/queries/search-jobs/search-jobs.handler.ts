import { Inject, Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BaseFilter, Page } from '@ssdev-toolkit/nestjs-core';
import { IQueueJobRepository, QueueJobFilter } from '../../../domain/repositories/queue-job.repository';
import { QueueJobResponseMapper } from '../../mappers/queue-job-response.mapper';
import { QueueJobSearchResultDto } from '../../dtos/queue-job.dtos';
import { SearchJobsQuery } from './search-jobs.query';

@QueryHandler(SearchJobsQuery)
@Injectable()
export class SearchJobsHandler
  implements IQueryHandler<SearchJobsQuery, Page<QueueJobSearchResultDto>> {
  constructor(@Inject(IQueueJobRepository) private readonly jobRepo: IQueueJobRepository) { }

  async execute({ params }: SearchJobsQuery): Promise<Page<QueueJobSearchResultDto>> {
    const filter: QueueJobFilter = {
      jobName: params.jobName,
      queueName: params.queueName,
      status: params.status,
    };
    const page = await this.jobRepo.findPaged(
      new BaseFilter<QueueJobFilter>(filter, params.pageIndex, params.pageSize),
    );
    return new Page(
      page.content.map(j => QueueJobResponseMapper.toSearchResult(j)),
      page.totalSize,
      page.pageIndex,
      page.pageSize,
    );
  }
}
