import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Document } from '../aggregates/document.aggregate';

export type DocumentDeletedSnapshot = Pick<Document, 'id' | 'fileName' | 'remotePath' | 'uploadedById'>;

/** Emitted by Document.softDelete(). */
export class DocumentDeletedEvent extends DomainEvent<DocumentDeletedSnapshot> {
  constructor(snapshot: DocumentDeletedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
