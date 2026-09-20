import 'reflect-metadata';
import { RenameDocumentHandler } from './rename-document.handler';
import { RenameDocumentCommand } from './rename-document.command';
import { Document } from '../../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
import { DocumentRenamedEvent } from '../../../domain/events/document-renamed.event';
import {
  DocumentAccessDeniedError,
  DocumentNotFoundError,
} from '../../../domain/errors/document.errors';
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
    update: jest.fn().mockImplementation(async (_id: any, d: any) => d),
    delete: jest.fn(),
    count: jest.fn(),
    findAllByEntity: jest.fn(),
    countByEntity: jest.fn(),
  };
}

function makeEventBus() {
  return { publishAll: jest.fn() };
}

function makeStorageProvider() {
  return { renameFile: jest.fn() };
}

function buildHandler(
  overrides: {
    repo?: ReturnType<typeof makeRepo>;
    storageProvider?: ReturnType<typeof makeStorageProvider>;
    options?: typeof DEFAULT_OPTIONS;
    accessPort?: any;
    eventBus?: ReturnType<typeof makeEventBus>;
  } = {},
) {
  const repo = overrides.repo ?? makeRepo();
  const storageProvider = overrides.storageProvider ?? makeStorageProvider();
  const options = overrides.options ?? DEFAULT_OPTIONS;
  const accessPort = overrides.accessPort ?? null;
  const eventBus = overrides.eventBus ?? makeEventBus();

  const handler = new RenameDocumentHandler(
    repo as any,
    storageProvider as any,
    options as any,
    accessPort,
    eventBus as any,
  );
  return { handler, repo, eventBus };
}

const BASE_COMMAND = new RenameDocumentCommand('doc-1', 'updated-report.pdf', 'user-1', [
  'write:docs',
]);

describe('RenameDocumentHandler', () => {
  it('renames the document and returns a DocumentResponseDto', async () => {
    const { handler } = buildHandler();

    const result = await handler.execute(BASE_COMMAND);

    expect(result).toBeInstanceOf(DocumentResponseDto);
    expect(result.fileName).toBe('updated-report.pdf');
  });

  it('persists the renamed document via repo.update using the document uuid', async () => {
    const doc = buildDocument();
    const repo = makeRepo(doc);
    const { handler } = buildHandler({ repo });

    await handler.execute(BASE_COMMAND);

    expect(repo.update).toHaveBeenCalledTimes(1);
    const [id, updatedDoc] = repo.update.mock.calls[0];
    expect(id).toBe(doc.id);
    expect(updatedDoc.fileName).toBe('updated-report.pdf');
  });

  it('dispatches DocumentRenamedEvent after successful repo write', async () => {
    const eventBus = makeEventBus();
    const repo = makeRepo();
    const callOrder: string[] = [];

    repo.update.mockImplementation(async (_id: any, d: any) => {
      callOrder.push('update');
      return d;
    });
    eventBus.publishAll.mockImplementation(() => {
      callOrder.push('publishAll');
    });

    const { handler } = buildHandler({ repo, eventBus });

    await handler.execute(BASE_COMMAND);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    const events = eventBus.publishAll.mock.calls[0][0];
    expect(events.some((e: any) => e instanceof DocumentRenamedEvent)).toBe(true);
    expect(callOrder.indexOf('update')).toBeLessThan(callOrder.indexOf('publishAll'));
  });

  it('throws DocumentNotFoundError when document does not exist', async () => {
    const { handler } = buildHandler({ repo: makeRepo(null) });

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(DocumentNotFoundError);
  });

  it('throws DocumentAccessDeniedError when user lacks write permission', async () => {
    const { handler } = buildHandler();
    const command = new RenameDocumentCommand('doc-1', 'new.pdf', 'user-1', ['read:docs']);

    await expect(handler.execute(command)).rejects.toThrow(DocumentAccessDeniedError);
  });

  it('calls record-level accessPort and throws when denied', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(DocumentAccessDeniedError);
    expect(accessPort.canAccess).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'write' }),
    );
  });

  it('completes when accessPort grants access', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(true) };
    const { handler } = buildHandler({ accessPort });

    await expect(handler.execute(BASE_COMMAND)).resolves.toBeInstanceOf(DocumentResponseDto);
  });
});
