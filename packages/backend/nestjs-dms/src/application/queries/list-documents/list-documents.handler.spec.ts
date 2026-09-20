import 'reflect-metadata';
import { ListDocumentsHandler } from './list-documents.handler';
import { ListDocumentsQuery } from './list-documents.query';
import { Document } from '../../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
import { DocumentResponseDto } from '../../../presentation/dtos/document-response.dto';

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

function makeRepo(docs: Document[] = []) {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findAllByEntity: jest.fn().mockResolvedValue(docs),
    countByEntity: jest.fn(),
  };
}

function buildHandler(
  overrides: {
    repo?: ReturnType<typeof makeRepo>;
    options?: typeof DEFAULT_OPTIONS;
    accessPort?: any;
  } = {},
) {
  const repo = overrides.repo ?? makeRepo();
  const options = overrides.options ?? DEFAULT_OPTIONS;
  const accessPort = overrides.accessPort ?? null;

  const handler = new ListDocumentsHandler(repo as any, options as any, accessPort);
  return { handler, repo };
}

const BASE_QUERY = new ListDocumentsQuery('donation', 'entity-1', 'user-1', ['read:docs']);

describe('ListDocumentsHandler', () => {
  it('returns an array of DocumentResponseDto for the given entity', async () => {
    const docs = [buildDocument(), buildDocument()];
    const { handler } = buildHandler({ repo: makeRepo(docs) });

    const result = await handler.execute(BASE_QUERY);

    expect(result.hasAccess).toBe(true);
    expect(result.data).toHaveLength(2);
    result.data.forEach((dto) => expect(dto).toBeInstanceOf(DocumentResponseDto));
  });

  it('passes entityType and entityId to repo.findAllByEntity', async () => {
    const { handler, repo } = buildHandler();

    await handler.execute(BASE_QUERY);

    expect(repo.findAllByEntity).toHaveBeenCalledWith('donation', 'entity-1');
  });

  it('returns empty data array when entity has no documents', async () => {
    const { handler } = buildHandler({ repo: makeRepo([]) });

    const result = await handler.execute(BASE_QUERY);

    expect(result.hasAccess).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('returns hasAccess: false for an unlisted entityType', async () => {
    const { handler } = buildHandler();
    const query = new ListDocumentsQuery('invoice', 'entity-1', 'user-1', ['read:docs']);

    const result = await handler.execute(query);

    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('DOCUMENT_ENTITY_TYPE_FORBIDDEN');
    expect(result.message).toBe('Document entity type is not supported.');
    expect(result.message).not.toContain('invoice');
    expect(result.data).toEqual([]);
  });

  it('returns hasAccess: false when user lacks read permission', async () => {
    const { handler } = buildHandler();
    const query = new ListDocumentsQuery('donation', 'entity-1', 'user-1', ['write:docs']);

    const result = await handler.execute(query);

    expect(result.hasAccess).toBe(false);
    expect(result.reason).toBe('DOCUMENT_ACCESS_DENIED');
    expect(result.message).toBe('You do not have permission to access the requested document.');
    expect(result.message).not.toContain('entity-1');
    expect(result.data).toEqual([]);
  });

  it('returns hasAccess: false when record-level accessPort denies access', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler } = buildHandler({ accessPort });

    const result = await handler.execute(BASE_QUERY);

    expect(result.hasAccess).toBe(false);
    expect(result.data).toEqual([]);
    expect(accessPort.canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read', entityType: 'donation', entityId: 'entity-1' }),
    );
  });

  it('returns documents when record-level accessPort grants access', async () => {
    const docs = [buildDocument()];
    const accessPort = { canAccess: jest.fn().mockResolvedValue(true) };
    const { handler } = buildHandler({ repo: makeRepo(docs), accessPort });

    const result = await handler.execute(BASE_QUERY);

    expect(result.hasAccess).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
