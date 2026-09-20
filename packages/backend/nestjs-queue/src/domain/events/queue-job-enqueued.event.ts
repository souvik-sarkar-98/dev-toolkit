import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export interface QueueJobEnqueuedSnapshot {
  readonly id: string;
  readonly jobName: string;
  readonly queueName: string;
  readonly enqueuedAt: string;
}

export class QueueJobEnqueuedEvent extends DomainEvent<QueueJobEnqueuedSnapshot> {
  constructor(snapshot: QueueJobEnqueuedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
