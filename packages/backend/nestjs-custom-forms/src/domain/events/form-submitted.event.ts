import { RootEvent } from '@ssdev-toolkit/nestjs-core';

/**
 * Emitted by FormSubmission.submit() when a draft submission is finalised.
 *
 * Uses RootEvent (not DomainEvent) because downstream consumers may span
 * multiple bounded contexts reacting to a completed form submission.
 */
export class FormSubmittedEvent extends RootEvent {
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly formId: string,
    public readonly submittedBy: string,
  ) {
    super();
  }
}
