import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Form } from '../aggregates/form/form.aggregate';

export type FormUpdatedSnapshot = Pick<
  Form,
  'id' | 'entityType' | 'key' | 'label' | 'description' | 'status' | 'managePermissions' | 'readPermissions' | 'writePermissions'
>;

/** Emitted by Form.updateMetadata(). */
export class FormUpdatedEvent extends DomainEvent<FormUpdatedSnapshot> {
  constructor(snapshot: FormUpdatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
