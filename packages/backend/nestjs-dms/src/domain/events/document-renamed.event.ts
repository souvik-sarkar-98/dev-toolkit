import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { Document } from '../aggregates/document.aggregate';

export type DocumentRenamedSnapshot = Pick<Document, 'id' | 'fileName' | 'remotePath' | 'uploadedById'>;

/** Emitted by Document.rename(). Carries the previous file name for audit purposes. */
export class DocumentRenamedEvent extends DomainEvent<DocumentRenamedSnapshot> {
  constructor(
    snapshot: DocumentRenamedSnapshot,
    public readonly previousName: string,
  ) {
    super(snapshot.id, snapshot);
  }
}
