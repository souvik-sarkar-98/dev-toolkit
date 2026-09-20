import 'reflect-metadata';
import { Document } from './document.aggregate';
import { DocumentMapping } from '../entities/document-mapping.entity';
import { DocumentVisibility } from '../enums/document-visibility.enum';
import { DocumentUploadedEvent } from '../events/document-uploaded.event';
import { DocumentDeletedEvent } from '../events/document-deleted.event';
import { DocumentRenamedEvent } from '../events/document-renamed.event';
import { BusinessError } from '@ssdev-toolkit/nestjs-core';

const BASE_PARAMS = {
  fileName: 'report.pdf',
  contentType: 'application/pdf',
  fileSize: 2048,
  remotePath: 'uploads/report.pdf',
  publicToken: 'token-abc',
  mappedTo: [] as DocumentMapping[],
  visibility: DocumentVisibility.Private,
  uploadedById: 'user-1' as string | undefined,
  storageOwnerId: undefined as string | undefined,
};

function buildDocument(overrides: Partial<typeof BASE_PARAMS> = {}): Document {
  return Document.create({ ...BASE_PARAMS, ...overrides });
}

describe('Document aggregate', () => {
  describe('create()', () => {
    it('returns a Document instance with all fields set', () => {
      const doc = buildDocument({
        mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
      });

      expect(doc).toBeInstanceOf(Document);
      expect(doc.fileName).toBe('report.pdf');
      expect(doc.contentType).toBe('application/pdf');
      expect(doc.fileSize).toBe(2048);
      expect(doc.remotePath).toBe('uploads/report.pdf');
      expect(doc.publicToken).toBe('token-abc');
      expect(doc.visibility).toBe(DocumentVisibility.Private);
      expect(doc.uploadedById).toBe('user-1');
    });

    it('assigns a unique UUID as id', () => {
      const doc1 = buildDocument();
      const doc2 = buildDocument();

      expect(doc1.id).toBeTruthy();
      expect(doc1.id).not.toBe(doc2.id);
    });

    it('emits exactly one DocumentUploadedEvent', () => {
      const doc = buildDocument();

      expect(doc.domainEvents).toHaveLength(1);
      expect(doc.domainEvents[0]).toBeInstanceOf(DocumentUploadedEvent);
    });

    it('event.snapshot.id matches the created aggregate', () => {
      const doc = buildDocument();
      const event = doc.domainEvents[0] as DocumentUploadedEvent;

      expect(event.snapshot.id).toBe(doc.id);
      expect(event.aggregateId).toBe(doc.id);
    });

    it('mappings are set from mappedTo param', () => {
      const doc = buildDocument({
        mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
      });

      expect(doc.mappings).toHaveLength(1);
      expect(doc.mappings[0].refId).toBe('entity-1');
      expect(doc.mappings[0].refType).toBe('donation');
    });

    it('isPublic is true when visibility is Public', () => {
      const doc = buildDocument({ visibility: DocumentVisibility.Public });

      expect(doc.isPublic).toBe(true);
    });

    it('isPublic is false when visibility is Private', () => {
      const doc = buildDocument({ visibility: DocumentVisibility.Private });

      expect(doc.isPublic).toBe(false);
    });

    it('storageOwnerId is set when provided', () => {
      const doc = buildDocument({ storageOwnerId: 'user-uuid-1' });

      expect(doc.storageOwnerId).toBe('user-uuid-1');
    });

    it('isDeleted is false on a fresh document', () => {
      const doc = buildDocument();

      expect(doc.isDeleted).toBe(false);
      expect(doc.deletedAt).toBeUndefined();
    });
  });

  describe('rename()', () => {
    it('throws BusinessError when new name is empty string', () => {
      const doc = buildDocument();

      expect(() => doc.rename('')).toThrow(BusinessError);
    });

    it('throws BusinessError when new name is whitespace only', () => {
      const doc = buildDocument();

      expect(() => doc.rename('   ')).toThrow(BusinessError);
    });

    it('is a no-op when new name equals current name (no event, no state change)', () => {
      const doc = buildDocument();
      doc.clearEvents();

      doc.rename('report.pdf');

      expect(doc.domainEvents).toHaveLength(0);
      expect(doc.fileName).toBe('report.pdf');
    });

    it('updates fileName when a different name is provided', () => {
      const doc = buildDocument();
      doc.clearEvents();

      doc.rename('new-report.pdf');

      expect(doc.fileName).toBe('new-report.pdf');
    });

    it('emits DocumentRenamedEvent with previous name', () => {
      const doc = buildDocument();
      doc.clearEvents();

      doc.rename('new-report.pdf');

      expect(doc.domainEvents).toHaveLength(1);
      const event = doc.domainEvents[0] as DocumentRenamedEvent;
      expect(event).toBeInstanceOf(DocumentRenamedEvent);
      expect(event.previousName).toBe('report.pdf');
      expect(event.snapshot.id).toBe(doc.id);
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt and marks document as deleted', () => {
      const doc = buildDocument();
      doc.clearEvents();
      const before = new Date();

      doc.softDelete();

      expect(doc.isDeleted).toBe(true);
      expect(doc.deletedAt).toBeDefined();
      expect(doc.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('emits DocumentDeletedEvent on first call', () => {
      const doc = buildDocument();
      doc.clearEvents();

      doc.softDelete();

      expect(doc.domainEvents).toHaveLength(1);
      expect(doc.domainEvents[0]).toBeInstanceOf(DocumentDeletedEvent);
      expect((doc.domainEvents[0] as DocumentDeletedEvent).snapshot.id).toBe(doc.id);
    });

    it('is idempotent — second call emits no additional event', () => {
      const doc = buildDocument();
      doc.softDelete();
      const firstDeletedAt = doc.deletedAt;
      doc.clearEvents();

      doc.softDelete();

      expect(doc.domainEvents).toHaveLength(0);
      expect(doc.deletedAt).toEqual(firstDeletedAt);
    });
  });

  describe('addMapping()', () => {
    it('appends a mapping to the mappings list', () => {
      const doc = buildDocument({ mappedTo: [] });
      const mapping = DocumentMapping.create({ refId: 'entity-2', refType: 'project' });

      doc.addMapping(mapping);

      expect(doc.mappings).toHaveLength(1);
      expect(doc.mappings[0].refId).toBe('entity-2');
      expect(doc.mappings[0].refType).toBe('project');
    });

    it('accumulates multiple mappings', () => {
      const doc = buildDocument({ mappedTo: [] });

      doc.addMapping(DocumentMapping.create({ refId: 'entity-1', refType: 'donation' }));
      doc.addMapping(DocumentMapping.create({ refId: 'entity-2', refType: 'project' }));

      expect(doc.mappings).toHaveLength(2);
    });
  });
});
