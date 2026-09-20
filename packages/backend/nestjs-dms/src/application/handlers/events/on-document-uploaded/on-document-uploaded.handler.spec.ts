import 'reflect-metadata';
import { OnDocumentUploadedHandler } from './on-document-uploaded.handler';
import { DocumentUploadedEvent, type DocumentUploadedSnapshot } from '../../../../domain/events/document-uploaded.event';
import { Document } from '../../../../domain/aggregates/document.aggregate';
import { DocumentVisibility } from '../../../../domain/enums/document-visibility.enum';

function buildDocument(): Document {
  return Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: [],
    visibility: DocumentVisibility.Private,
    uploadedById: 'user-1',
  });
}

describe('OnDocumentUploadedHandler', () => {
  it('handle() completes without throwing for a valid DocumentUploadedEvent', async () => {
    const handler = new OnDocumentUploadedHandler();
    const doc = buildDocument();
    const event = new DocumentUploadedEvent(doc.toSnapshot<DocumentUploadedSnapshot>());

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('handle() accepts events with any document id', async () => {
    const handler = new OnDocumentUploadedHandler();
    const doc = buildDocument();
    const event = new DocumentUploadedEvent(doc.toSnapshot<DocumentUploadedSnapshot>());

    expect(event.snapshot.id).toBeTruthy();
    await expect(handler.handle(event)).resolves.not.toThrow();
  });
});
