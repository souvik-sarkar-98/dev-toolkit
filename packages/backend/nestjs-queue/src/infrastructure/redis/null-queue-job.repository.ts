import { Injectable } from '@nestjs/common';
import { BaseFilter, Page } from '@ssdev-toolkit/nestjs-core';
import { QueueJob } from '../../domain/aggregates/queue-job.aggregate';
import { IQueueJobRepository, QueueJobFilter } from '../../domain/repositories/queue-job.repository';

/**
 * No-op implementation of IQueueJobRepository.
 * Default binding — all operations are skipped silently.
 * Replace with QueueJobRedisRepository when job-log search is required.
 */
@Injectable()
export class NullQueueJobRepository implements IQueueJobRepository {
  async create(entity: QueueJob): Promise<QueueJob> { return entity; }
  async update(_id: string, entity: QueueJob): Promise<QueueJob> { return entity; }
  async findById(_id: string): Promise<QueueJob | null> { return null; }
  async findAll(_filter?: QueueJobFilter): Promise<QueueJob[]> { return []; }
  async findPaged(_filter?: BaseFilter<QueueJobFilter>): Promise<Page<QueueJob>> { return new Page<QueueJob>([], 0, 0, 0); }
  async delete(_id: string): Promise<void> { }
  async count(_filter: QueueJobFilter): Promise<number> { return 0; }
}
