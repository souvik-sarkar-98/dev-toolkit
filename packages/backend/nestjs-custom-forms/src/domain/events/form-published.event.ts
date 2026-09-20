import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Form } from '../aggregates/form/form.aggregate';

export type FormPublishedSnapshot = Pick<Form, 'id' | 'entityType' | 'key' | 'status' | 'publishedBy'>;

/** Emitted by Form.publish(). */
export class FormPublishedEvent extends DomainEvent<FormPublishedSnapshot> {
  constructor(snapshot: FormPublishedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
