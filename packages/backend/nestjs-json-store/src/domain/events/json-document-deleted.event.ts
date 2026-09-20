import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { JsonDocument } from '../aggregates/json-document.aggregate';

export type JsonDocumentDeletedSnapshot = Pick<JsonDocument, 'id' | 'key' | 'namespace'>;

/** Emitted by JsonDocument.markDeleted(). */
export class JsonDocumentDeletedEvent extends DomainEvent<JsonDocumentDeletedSnapshot> {
  constructor(snapshot: JsonDocumentDeletedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
