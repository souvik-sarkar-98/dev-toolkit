import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { JsonDocument } from '../aggregates/json-document.aggregate';

export type JsonDocumentUpdatedSnapshot = Pick<JsonDocument, 'id' | 'key' | 'namespace'>;

/** Emitted by JsonDocument.update(). */
export class JsonDocumentUpdatedEvent extends DomainEvent<JsonDocumentUpdatedSnapshot> {
  constructor(snapshot: JsonDocumentUpdatedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
