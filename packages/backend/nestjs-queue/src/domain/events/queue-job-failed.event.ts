import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export interface QueueJobFailedSnapshot {
  readonly id: string;
  readonly jobName: string;
  readonly failedReason: string;
  readonly attemptsMade: number;
  readonly finishedAt: string;
}

export class QueueJobFailedEvent extends DomainEvent<QueueJobFailedSnapshot> {
  constructor(snapshot: QueueJobFailedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
