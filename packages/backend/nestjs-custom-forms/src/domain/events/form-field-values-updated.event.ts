import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { FormFieldValue } from '../entities/form-field-value/form-field-value.entity';

export type FormFieldValuesUpdatedSnapshot = Pick<
  FormFieldValue,
  'id' | 'entityType' | 'entityId' | 'formId' | 'fieldDefId' | 'value'
>;

/** Emitted by FormSubmission.saveDraft() after a successful value change. */
export class FormFieldValuesUpdatedEvent extends DomainEvent<FormFieldValuesUpdatedSnapshot> {
  constructor(snapshot: FormFieldValuesUpdatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
