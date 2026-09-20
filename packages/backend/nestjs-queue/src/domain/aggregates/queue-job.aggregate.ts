import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { JobStatus } from '../enums/job-status.enum';
import { QueueJobEnqueuedEvent } from '../events/queue-job-enqueued.event';
import { QueueJobStartedEvent } from '../events/queue-job-started.event';
import { QueueJobCompletedEvent } from '../events/queue-job-completed.event';
import { QueueJobFailedEvent } from '../events/queue-job-failed.event';
import { QueueJobInvalidStateTransitionError } from '../errors/queue.errors';

interface QueueJobProps {
  jobName: string;
  queueName: string;
  status: JobStatus;
  payload: Record<string, any>;
  failedReason?: string;
  attemptsMade: number;
  enqueuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export class QueueJob extends AggregateRoot<string> {
  #jobName: string;
  #queueName: string;
  #status: JobStatus;
  #payload: Record<string, any>;
  #failedReason?: string;
  #attemptsMade: number;
  #enqueuedAt: Date;
  #startedAt?: Date;
  #finishedAt?: Date;

  private constructor(
    id: string,
    props: QueueJobProps,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#jobName = props.jobName;
    this.#queueName = props.queueName;
    this.#status = props.status;
    this.#payload = props.payload;
    this.#failedReason = props.failedReason;
    this.#attemptsMade = props.attemptsMade;
    this.#enqueuedAt = props.enqueuedAt;
    this.#startedAt = props.startedAt;
    this.#finishedAt = props.finishedAt;
  }

  /**
   * Factory — called when a BullMQ job is enqueued.
   * Raises QueueJobEnqueuedEvent.
   */
  static enqueue(params: {
    jobId: string;
    jobName: string;
    queueName: string;
    payload: Record<string, any>;
  }): QueueJob {
    const now = new Date();
    const job = new QueueJob(params.jobId, {
      jobName: params.jobName,
      queueName: params.queueName,
      status: JobStatus.Waiting,
      payload: params.payload,
      attemptsMade: 0,
      enqueuedAt: now,
    });
    job.addDomainEvent(
      new QueueJobEnqueuedEvent({
        id: job.id,
        jobName: job.jobName,
        queueName: job.queueName,
        enqueuedAt: job.enqueuedAt.toISOString(),
      }),
    );
    return job;
  }

  /**
   * Reconstitution — used by the repository when loading from Redis.
   * No domain events are raised.
   */
  static reconstitute(
    id: string,
    props: QueueJobProps,
    createdAt?: Date,
    updatedAt?: Date,
  ): QueueJob {
    return new QueueJob(id, props, createdAt, updatedAt);
  }

  /**
   * Transitions from Waiting or Delayed → Active.
   * Raises QueueJobStartedEvent.
   */
  markActive(): void {
    if (this.#status !== JobStatus.Waiting && this.#status !== JobStatus.Delayed) {
      throw new QueueJobInvalidStateTransitionError(this.id, this.#status, JobStatus.Active);
    }
    this.#status = JobStatus.Active;
    this.#startedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new QueueJobStartedEvent({
        id: this.id,
        jobName: this.#jobName,
        startedAt: this.#startedAt.toISOString(),
      }),
    );
  }

  /**
   * Transitions to Completed.
   * Raises QueueJobCompletedEvent.
   */
  markCompleted(): void {
    this.#status = JobStatus.Completed;
    this.#finishedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new QueueJobCompletedEvent({
        id: this.id,
        jobName: this.#jobName,
        finishedAt: this.#finishedAt.toISOString(),
      }),
    );
  }

  /**
   * Transitions to Failed.
   * Raises QueueJobFailedEvent.
   */
  markFailed(reason: string, attemptsMade: number): void {
    this.#status = JobStatus.Failed;
    this.#failedReason = reason;
    this.#attemptsMade = attemptsMade;
    this.#finishedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new QueueJobFailedEvent({
        id: this.id,
        jobName: this.#jobName,
        failedReason: reason,
        attemptsMade,
        finishedAt: this.#finishedAt.toISOString(),
      }),
    );
  }

  get jobName(): string { return this.#jobName; }
  get queueName(): string { return this.#queueName; }
  get status(): JobStatus { return this.#status; }
  get payload(): Record<string, any> { return { ...this.#payload }; }
  get failedReason(): string | undefined { return this.#failedReason; }
  get attemptsMade(): number { return this.#attemptsMade; }
  get enqueuedAt(): Date { return this.#enqueuedAt; }
  get startedAt(): Date | undefined { return this.#startedAt; }
  get finishedAt(): Date | undefined { return this.#finishedAt; }
}
