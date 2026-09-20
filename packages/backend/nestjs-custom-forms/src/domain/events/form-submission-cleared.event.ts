import { RootEvent } from '@ssdev-toolkit/nestjs-core';

/**
 * Emitted after all form submission values for an entity record are cleared.
 *
 * Uses RootEvent (not DomainEvent) because the deletion spans multiple
 * FormFieldValue entities — it is not tied to a single aggregate root's
 * state change.
 */
export class FormSubmissionClearedEvent extends RootEvent {
  public readonly occurredAt: Date = new Date();

  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly formId: string,
    public readonly clearedByUserId: string,
  ) {
    super();
  }
}
