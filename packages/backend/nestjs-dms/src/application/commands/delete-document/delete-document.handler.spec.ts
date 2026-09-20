import 'reflect-metadata';
import { DeleteDocumentHandler } from './delete-document.handler';
import { DeleteDocumentCommand } from './delete-document.command';
import { Document } from '../../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
import { DocumentDeletedEvent } from '../../../domain/events/document-deleted.event';
import {
  DocumentAccessDeniedError,
  DocumentNotFoundError,
} from '../../../domain/errors/document.errors';

const DEFAULT_OPTIONS = {
  maxFileSizeMb: 10,
  allowedMimeTypes: ['application/pdf'],
  allowedEntityTypes: [
    {
      entityType: 'donation',
      readPermissions: ['read:docs'],
      writePermissions: ['write:docs'],
    },
  ],
  provider: 'firebase' as const,
};

function buildDocument(deletedAt?: Date): Document {
  const doc = Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
    visibility: DocumentVisibility.Private,
    uploadedById: 'user-1',
  });
  doc.clearEvents();
  if (deletedAt) {
    doc.softDelete();
    doc.clearEvents();
  }
  return doc;
}

function makeRepo(doc: Document | null = buildDocument()) {
  return {
    findById: jest.fn().mockResolvedValue(doc),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(doc),
    delete: jest.fn(),
    count: jest.fn(),
    findAllByEntity: jest.fn(),
    countByEntity: jest.fn(),
  };
}

function makeStorage() {
  return {
    uploadFile: jest.fn(),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getSignedUrl: jest.fn(),
    downloadFile: jest.fn(),
  };
}

function makeEventBus() {
  return { publishAll: jest.fn() };
}

function buildHandler(
  overrides: {
    repo?: ReturnType<typeof makeRepo>;
    storage?: ReturnType<typeof makeStorage>;
    options?: typeof DEFAULT_OPTIONS;
    accessPort?: any;
    eventBus?: ReturnType<typeof makeEventBus>;
  } = {},
) {
  const repo = overrides.repo ?? makeRepo();
  const storage = overrides.storage ?? makeStorage();
  const options = overrides.options ?? DEFAULT_OPTIONS;
  const accessPort = overrides.accessPort ?? null;
  const eventBus = overrides.eventBus ?? makeEventBus();

  const handler = new DeleteDocumentHandler(
    repo as any,
    storage as any,
    options as any,
    accessPort,
    eventBus as any,
  );
  return { handler, repo, storage, eventBus };
}

const BASE_COMMAND = new DeleteDocumentCommand('doc-1', 'user-1', ['write:docs']);

describe('DeleteDocumentHandler', () => {
  it('soft-deletes the document, removes it from storage, and updates the repo', async () => {
    const doc = buildDocument();
    const { handler, repo, storage } = buildHandler({ repo: makeRepo(doc) });

    await handler.execute(BASE_COMMAND);

    expect(doc.isDeleted).toBe(true);
    expect(storage.deleteFile).toHaveBeenCalledWith(doc.remotePath, doc.storageOwnerId);
    expect(repo.update).toHaveBeenCalledWith(doc.id, doc);
  });

  it('dispatches DocumentDeletedEvent after successful repo update', async () => {
    const doc = buildDocument();
    const eventBus = makeEventBus();
    const repo = makeRepo(doc);
    const callOrder: string[] = [];

    repo.update.mockImplementation(async () => {
      callOrder.push('update');
      return doc;
    });
    eventBus.publishAll.mockImplementation(() => {
      callOrder.push('publishAll');
    });

    const { handler } = buildHandler({ repo, eventBus });

    await handler.execute(BASE_COMMAND);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    const events = eventBus.publishAll.mock.calls[0][0];
    expect(events.some((e: any) => e instanceof DocumentDeletedEvent)).toBe(true);
    expect(callOrder.indexOf('update')).toBeLessThan(callOrder.indexOf('publishAll'));
  });

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const { handler } = buildHandler({ repo: makeRepo(null) });

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(DocumentNotFoundError);
  });

  it('throws DocumentAccessDeniedError when user lacks write permission for all mappings', async () => {
    const { handler } = buildHandler({ repo: makeRepo(buildDocument()) });
    const command = new DeleteDocumentCommand('doc-1', 'user-1', ['read:docs']);

    await expect(handler.execute(command)).rejects.toThrow(DocumentAccessDeniedError);
  });

  it('calls record-level accessPort.canAccess and throws when denied', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(DocumentAccessDeniedError);
    expect(accessPort.canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'write', entityType: 'donation' }),
    );
  });

  it('proceeds when record-level accessPort grants access', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(true) };
    const { handler, repo } = buildHandler({ accessPort });

    await handler.execute(BASE_COMMAND);

    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
