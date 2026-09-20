import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseFilter, Page } from '@ssdev-toolkit/nestjs-core';
import { QueueJob } from '../../domain/aggregates/queue-job.aggregate';
import { JobStatus } from '../../domain/enums/job-status.enum';
import { IQueueJobRepository, QueueJobFilter } from '../../domain/repositories/queue-job.repository';
import { RedisStoreService } from './redis-store.service';

export const QUEUE_JOB_REDIS_STORE = Symbol('QUEUE_JOB_REDIS_STORE');

const NS = 'q2:job';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — mirrors REMOVE_ON_FAIL

/** Flat Redis hash representation of a QueueJob. */
interface JobRecord {
  id: string;
  jobName: string;
  queueName: string;
  status: string;
  payload: string;        // JSON-serialised
  failedReason: string;
  attemptsMade: string;   // Redis stores everything as strings
  enqueuedAt: string;     // ISO string
  startedAt: string;      // ISO string or ''
  finishedAt: string;     // ISO string or ''
  executionLogs: string[];// Required by RedisStoreService.BaseEntity — always []
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class QueueJobRedisRepository implements IQueueJobRepository {
  private readonly logger = new Logger(QueueJobRedisRepository.name);

  constructor(@Inject(QUEUE_JOB_REDIS_STORE) private readonly store: RedisStoreService) { }

  // ── IRepository methods ────────────────────────────────────────────────────

  async create(entity: QueueJob): Promise<QueueJob> {
    const record = this.toRecord(entity);
    await this.store.save<JobRecord>(NS, record, {
      ttl: TTL_SECONDS,
      indexes: ['status', 'jobName', 'queueName'],
    });
    return entity;
  }

  async update(id: string, entity: QueueJob): Promise<QueueJob> {
    const patch: Partial<JobRecord> = {
      status: entity.status,
      attemptsMade: String(entity.attemptsMade),
      ...(entity.failedReason ? { failedReason: entity.failedReason } : {}),
      ...(entity.startedAt ? { startedAt: entity.startedAt.toISOString() } : {}),
      ...(entity.finishedAt ? { finishedAt: entity.finishedAt.toISOString() } : {}),
    };
    try {
      await this.store.update<JobRecord>(NS, id, patch, { indexes: ['status'] });
    } catch (err) {
      this.logger.warn(`update skipped for unknown job ${id}: ${(err as Error).message}`);
    }
    return entity;
  }

  async findById(id: string): Promise<QueueJob | null> {
    const record = await this.store.findById<JobRecord>(NS, id);
    return record ? this.fromRecord(record) : null;
  }

  async findAll(filter?: QueueJobFilter): Promise<QueueJob[]> {
    const page = await this.store.findAll<JobRecord>(NS, {
      cursor: '0',
      count: 10_000,
      filter: this.toFilterOption(filter),
      sortBy: 'desc',
    });
    return this.applyInMemoryFilters(page.content, filter).map(r => this.fromRecord(r));
  }

  async findPaged(filter?: BaseFilter<QueueJobFilter>): Promise<Page<QueueJob>> {
    const props = filter?.props;
    const pageIndex = filter?.pageIndex ?? 0;
    const pageSize = filter?.pageSize ?? 20;

    const page = await this.store.findAll<JobRecord>(NS, {
      cursor: '0',
      count: 10_000,
      filter: this.toFilterOption(props),
      sortBy: 'desc',
    });

    const filtered = this.applyInMemoryFilters(page.content, props);
    const total = filtered.length;
    const start = pageIndex * pageSize;
    const sliced = filtered.slice(start, start + pageSize);

    return new Page<QueueJob>(sliced.map(r => this.fromRecord(r)), total, pageIndex, pageSize);
  }

  async delete(id: string): Promise<void> {
    await this.store.delete<JobRecord>(NS, id, { indexes: ['status', 'jobName', 'queueName'] });
  }

  async count(filter: QueueJobFilter): Promise<number> {
    const all = await this.findAll(filter);
    return all.length;
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────

  private toRecord(job: QueueJob): JobRecord {
    return {
      id: job.id,
      jobName: job.jobName,
      queueName: job.queueName,
      status: job.status,
      payload: JSON.stringify(job.payload),
      failedReason: job.failedReason ?? '',
      attemptsMade: String(job.attemptsMade),
      enqueuedAt: job.enqueuedAt.toISOString(),
      startedAt: job.startedAt ? job.startedAt.toISOString() : '',
      finishedAt: job.finishedAt ? job.finishedAt.toISOString() : '',
      executionLogs: [],
    };
  }

  private fromRecord(record: JobRecord): QueueJob {
    return QueueJob.reconstitute(
      record.id,
      {
        jobName: record.jobName,
        queueName: record.queueName,
        status: record.status as JobStatus,
        payload: this.parseJson(record.payload),
        failedReason: record.failedReason || undefined,
        attemptsMade: Number(record.attemptsMade) || 0,
        enqueuedAt: new Date(record.enqueuedAt),
        startedAt: record.startedAt ? new Date(record.startedAt) : undefined,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : undefined,
      },
      record.createdAt ? new Date(record.createdAt) : undefined,
      record.updatedAt ? new Date(record.updatedAt) : undefined,
    );
  }

  private toFilterOption(filter?: QueueJobFilter) {
    if (!filter) return undefined;
    if (filter.status) return { field: 'status' as keyof JobRecord, value: filter.status };
    if (filter.jobName) return { field: 'jobName' as keyof JobRecord, value: filter.jobName };
    if (filter.queueName) return { field: 'queueName' as keyof JobRecord, value: filter.queueName };
    return undefined;
  }

  private applyInMemoryFilters(records: JobRecord[], filter?: QueueJobFilter): JobRecord[] {
    if (!filter) return records;
    return records.filter(r => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.jobName && r.jobName !== filter.jobName) return false;
      if (filter.queueName && r.queueName !== filter.queueName) return false;
      return true;
    });
  }

  private parseJson(raw: string): Record<string, any> {
    try { return JSON.parse(raw); } catch { return {}; }
  }
}
