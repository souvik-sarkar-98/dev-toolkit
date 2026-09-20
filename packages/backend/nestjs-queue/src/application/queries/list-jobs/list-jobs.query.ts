import { JobType } from 'bullmq';

export class ListJobsQuery {
  constructor(
    public readonly params: {
      pageIndex: number;
      pageSize: number;
      status?: JobType;
      jobId?: string;
    },
  ) {}
}
