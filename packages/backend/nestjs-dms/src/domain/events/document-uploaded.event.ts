import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Document } from '../aggregates/document.aggregate';

export type DocumentUploadedSnapshot = Pick<Document, 'id' | 'fileName' | 'remotePath' | 'publicToken' | 'uploadedById'>;

/** Emitted by Document.create(). */
export class DocumentUploadedEvent extends DomainEvent<DocumentUploadedSnapshot> {
  constructor(snapshot: DocumentUploadedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
