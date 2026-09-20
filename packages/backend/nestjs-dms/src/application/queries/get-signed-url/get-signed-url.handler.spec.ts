import 'reflect-metadata';
import { GetSignedUrlHandler } from './get-signed-url.handler';
import { GetSignedUrlQuery } from './get-signed-url.query';
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

function buildDocument(visibility: DocumentVisibility = DocumentVisibility.Private): Document {
  const doc = Document.create({
    fileName: 'report.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    remotePath: 'uploads/report.pdf',
    publicToken: 'token-abc',
    mappedTo: [DocumentMapping.create({ refId: 'entity-1', refType: 'donation' })],
    visibility,
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

function makeStorage(signedUrl = 'https://signed.example/report.pdf') {
  return {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn().mockResolvedValue(signedUrl),
    downloadFile: jest.fn(),
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

  const handler = new GetSignedUrlHandler(repo as any, storage as any, options as any, accessPort);
  return { handler, repo, storage };
}

const BASE_QUERY = new GetSignedUrlQuery('doc-1', 'user-1', ['read:docs']);

describe('GetSignedUrlHandler', () => {
  it('returns the signed URL from storageProvider for a private document', async () => {
    const { handler, storage } = buildHandler();

    const result = await handler.execute(BASE_QUERY);

    expect(result).toBe('https://signed.example/report.pdf');
    expect(storage.getSignedUrl).toHaveBeenCalledWith(
      'uploads/report.pdf',
      undefined,
    );
  });

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const { handler } = buildHandler({ repo: makeRepo(null) });

    await expect(handler.execute(BASE_QUERY)).rejects.toThrow(DocumentNotFoundError);
  });

  it('throws DocumentAccessDeniedError when user lacks read permission', async () => {
    const { handler } = buildHandler();
    const query = new GetSignedUrlQuery('doc-1', 'user-1', ['write:docs']);

    await expect(handler.execute(query)).rejects.toThrow(DocumentAccessDeniedError);
  });

  it('passes storageOwnerId to getSignedUrl for Drive-backed documents', async () => {
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
    const storage = makeStorage('https://drive.google.com/view');
    const { handler } = buildHandler({ repo, storage });

    const result = await handler.execute(BASE_QUERY);

    expect(storage.getSignedUrl).toHaveBeenCalledWith('drive-file-id', 'user-uuid-1');
    expect(result).toBe('https://drive.google.com/view');
  });

  it('calls record-level accessPort and throws when denied', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_QUERY)).rejects.toThrow(DocumentAccessDeniedError);
    expect(accessPort.canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read' }),
    );
  });

  it('returns signed URL when record-level accessPort grants access', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(true) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_QUERY)).resolves.toBe('https://signed.example/report.pdf');
  });
});
