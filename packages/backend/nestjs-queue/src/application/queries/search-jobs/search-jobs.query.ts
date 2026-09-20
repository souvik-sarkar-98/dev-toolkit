import { JobStatus } from '../../../domain/enums/job-status.enum';

export class SearchJobsQuery {
  constructor(
    public readonly params: {
      jobName?: string;
      queueName?: string;
      status?: JobStatus;
      pageIndex?: number;
      pageSize?: number;
    },
  ) {}
}
