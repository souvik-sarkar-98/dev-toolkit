import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export type FormFieldUpdatedSnapshot = {
  formId: string;
  field: Record<string, unknown>;
};

/** Emitted by Form.updateField(). */
export class FormFieldUpdatedEvent extends DomainEvent<FormFieldUpdatedSnapshot> {
  constructor(snapshot: FormFieldUpdatedSnapshot) {
    super(snapshot.formId, snapshot);
  }
}
