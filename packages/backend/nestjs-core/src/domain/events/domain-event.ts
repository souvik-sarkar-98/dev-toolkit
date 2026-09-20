import { RootEvent } from './root-event';

export abstract class DomainEvent<
  TSnapshot extends Record<string, any> = Record<string, any>
> extends RootEvent {
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly snapshot: Readonly<TSnapshot>;

  constructor(aggregateId: string, snapshot: TSnapshot) {
    super();
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
    this.snapshot = Object.freeze({ ...snapshot }) as Readonly<TSnapshot>;
  }
}
