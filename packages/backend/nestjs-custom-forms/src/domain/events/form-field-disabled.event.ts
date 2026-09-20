import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { FormFieldDefinition } from '../entities/form-field-definition/form-field-definition.entity';

export type FormFieldDisabledSnapshot = {
  formId: string;
  field: Pick<FormFieldDefinition, 'id' | 'formId' | 'key' | 'enabled' | 'disabledBy'>;
};

/** Emitted by Form.disableField(). */
export class FormFieldDisabledEvent extends DomainEvent<FormFieldDisabledSnapshot> {
  constructor(snapshot: FormFieldDisabledSnapshot) {
    super(snapshot.formId, snapshot);
  }
}
