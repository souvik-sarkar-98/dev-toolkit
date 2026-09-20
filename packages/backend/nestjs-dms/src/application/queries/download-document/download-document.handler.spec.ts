import 'reflect-metadata';
import { DownloadDocumentHandler } from './download-document.handler';
import { DownloadDocumentQuery } from './download-document.query';
import { Document } from '../../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
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

function buildDocument(): Document {
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
  return doc;
}

function makeRepo(doc: Document | null = buildDocument()) {
  return {
    findById: jest.fn().mockResolvedValue(doc),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findAllByEntity: jest.fn(),
    countByEntity: jest.fn(),
  };
}

const mockStream = {} as NodeJS.ReadableStream;

function makeStorage() {
  return {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
    downloadFile: jest.fn().mockResolvedValue(mockStream),
  };
}

function buildHandler(
  overrides: {
    repo?: ReturnType<typeof makeRepo>;
    storage?: ReturnType<typeof makeStorage>;
    options?: typeof DEFAULT_OPTIONS;
    accessPort?: any;
  } = {},
) {
  const repo = overrides.repo ?? makeRepo();
  const storage = overrides.storage ?? makeStorage();
  const options = overrides.options ?? DEFAULT_OPTIONS;
  const accessPort = overrides.accessPort ?? null;

  const handler = new DownloadDocumentHandler(
    repo as any,
    storage as any,
    options as any,
    accessPort,
  );
  return { handler, repo, storage };
}

const BASE_QUERY = new DownloadDocumentQuery('doc-1', 'user-1', ['read:docs']);

describe('DownloadDocumentHandler', () => {
  it('returns fileName, contentType, and stream from storage', async () => {
    const { handler, storage } = buildHandler();

    const result = await handler.execute(BASE_QUERY);

    expect(result.fileName).toBe('report.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(result.stream).toBe(mockStream);
    expect(storage.downloadFile).toHaveBeenCalledWith('uploads/report.pdf', undefined);
  });

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const { handler } = buildHandler({ repo: makeRepo(null) });

    await expect(handler.execute(BASE_QUERY)).rejects.toThrow(DocumentNotFoundError);
  });

  it('throws DocumentAccessDeniedError when user lacks read permission', async () => {
    const { handler } = buildHandler();
    const query = new DownloadDocumentQuery('doc-1', 'user-1', ['write:docs']);

    await expect(handler.execute(query)).rejects.toThrow(DocumentAccessDeniedError);
  });

  it('passes storageOwnerId to downloadFile for Drive-backed documents', async () => {
    const doc = Document.create({
      fileName: 'report.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
      remotePath: 'drive-file-id',
      publicToken: 'token-abc',
      mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
      visibility: DocumentVisibility.Private,
      storageOwnerId: 'user-uuid-1',
    });
    doc.clearEvents();
    const repo = makeRepo(doc);
    const storage = makeStorage();
    const { handler } = buildHandler({ repo, storage });

    await handler.execute(BASE_QUERY);

    expect(storage.downloadFile).toHaveBeenCalledWith('drive-file-id', 'user-uuid-1');
  });

  it('calls record-level accessPort and throws when denied', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_QUERY)).rejects.toThrow(DocumentAccessDeniedError);
  });

  it('completes when record-level accessPort grants access', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(true) };
    const { handler } = buildHandler({ accessPort });

    const result = await handler.execute(BASE_QUERY);

    expect(result.stream).toBe(mockStream);
  });
});
