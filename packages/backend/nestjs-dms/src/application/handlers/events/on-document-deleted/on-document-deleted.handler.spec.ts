import 'reflect-metadata';
import { OnDocumentDeletedHandler } from './on-document-deleted.handler';
import { DocumentDeletedEvent, type DocumentDeletedSnapshot } from '../../../../domain/events/document-deleted.event';
import { Document } from '../../../../domain/aggregates/document.aggregate';
import { DocumentVisibility } from '../../../../domain/enums/document-visibility.enum';

function buildDocument(): Document {
  const doc = Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: [],
    visibility: DocumentVisibility.Private,
    uploadedById: 'user-1',
  });
  doc.softDelete();
  doc.clearEvents();
  return doc;
}

describe('OnDocumentDeletedHandler', () => {
  it('handle() completes without throwing for a valid DocumentDeletedEvent', async () => {
    const handler = new OnDocumentDeletedHandler();
    const doc = buildDocument();
    const event = new DocumentDeletedEvent(doc.toSnapshot<DocumentDeletedSnapshot>());

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('handle() receives the event with the correct document reference', async () => {
    const handler = new OnDocumentDeletedHandler();
    const doc = buildDocument();
    const event = new DocumentDeletedEvent(doc.toSnapshot<DocumentDeletedSnapshot>());

    expect(event.snapshot.id).toBe(doc.id);
    expect(event.snapshot.fileName).toBe(doc.fileName);
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
