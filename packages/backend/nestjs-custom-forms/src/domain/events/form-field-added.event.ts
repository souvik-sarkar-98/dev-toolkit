import { DomainEvent } from '@ssdev-toolkit/nestjs-core';

export type FormFieldAddedSnapshot = {
  formId: string;
  field: Record<string, unknown>;
};

/** Emitted by Form.addField(). */
export class FormFieldAddedEvent extends DomainEvent<FormFieldAddedSnapshot> {
  constructor(snapshot: FormFieldAddedSnapshot) {
    super(snapshot.formId, snapshot);
  }
}
