import 'reflect-metadata';
import { Document } from '../aggregates/document.aggregate';
import { DocumentMapping } from '../entities/document-mapping.entity';
import { DocumentVisibility } from '../enums/document-visibility.enum';
import { DocumentUploadedEvent, type DocumentUploadedSnapshot } from './document-uploaded.event';
import { DocumentDeletedEvent, type DocumentDeletedSnapshot } from './document-deleted.event';
import { DocumentRenamedEvent, type DocumentRenamedSnapshot } from './document-renamed.event';

function buildDocument(): Document {
  return Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
    visibility: DocumentVisibility.Private,
    uploadedById: 'user-1',
  });
}

describe('Domain Events — payload shape', () => {
  describe('DocumentUploadedEvent', () => {
    it('carries the document snapshot and aggregateId equals document.id', () => {
      const doc = buildDocument();
      const event = new DocumentUploadedEvent(doc.toSnapshot<DocumentUploadedSnapshot>());

      expect(event.snapshot.id).toBe(doc.id);
      expect(event.aggregateId).toBe(doc.id);
    });

    it('has an occurredAt timestamp', () => {
      const doc = buildDocument();
      const before = new Date();
      const event = new DocumentUploadedEvent(doc.toSnapshot<DocumentUploadedSnapshot>());

      expect(event.occurredAt).toBeDefined();
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('DocumentDeletedEvent', () => {
    it('carries the document snapshot and aggregateId equals document.id', () => {
      const doc = buildDocument();
      const event = new DocumentDeletedEvent(doc.toSnapshot<DocumentDeletedSnapshot>());

      expect(event.snapshot.id).toBe(doc.id);
      expect(event.aggregateId).toBe(doc.id);
    });

    it('has an occurredAt timestamp', () => {
      const doc = buildDocument();
      const event = new DocumentDeletedEvent(doc.toSnapshot<DocumentDeletedSnapshot>());

      expect(event.occurredAt).toBeDefined();
    });
  });

  describe('DocumentRenamedEvent', () => {
    it('carries the document snapshot, aggregateId, and previousName', () => {
      const doc = buildDocument();
      const event = new DocumentRenamedEvent(doc.toSnapshot<DocumentRenamedSnapshot>(), 'old-report.pdf');

      expect(event.snapshot.id).toBe(doc.id);
      expect(event.aggregateId).toBe(doc.id);
      expect(event.previousName).toBe('old-report.pdf');
    });

    it('has an occurredAt timestamp', () => {
      const doc = buildDocument();
      const event = new DocumentRenamedEvent(doc.toSnapshot<DocumentRenamedSnapshot>(), 'old.pdf');

      expect(event.occurredAt).toBeDefined();
    });

    it('is emitted by Document.rename() with the correct previous name captured', () => {
      const doc = buildDocument();
      doc.clearEvents();

      doc.rename('updated-report.pdf');

      const event = doc.domainEvents[0] as DocumentRenamedEvent;
      expect(event).toBeInstanceOf(DocumentRenamedEvent);
      expect(event.previousName).toBe('report.pdf');
    });
  });
});
