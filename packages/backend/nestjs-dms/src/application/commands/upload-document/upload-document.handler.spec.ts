import 'reflect-metadata';
import { UploadDocumentHandler } from './upload-document.handler';
import { UploadDocumentCommand } from './upload-document.command';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
import { DocumentUploadedEvent } from '../../../domain/events/document-uploaded.event';
import { DocumentResponseDto } from '../../../presentation/dtos/document-response.dto';
import { EntityTypeForbiddenError } from '@ssdev-toolkit/nestjs-core';
import {
  DocumentLimitReachedError,
  FileSizeExceededError,
  MimeTypeNotAllowedError,
} from '../../../domain/errors/document.errors';

const DEFAULT_OPTIONS = {
  maxFileSizeMb: 10,
  allowedMimeTypes: ['application/pdf', 'image/*'],
  allowedEntityTypes: [
    {
      entityType: 'donation',
      readPermissions: ['read:docs'],
      writePermissions: ['write:docs'],
    },
  ],
  provider: 'firebase' as const,
};

function makeRepo() {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    findPaged: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findAllByEntity: jest.fn(),
    countByEntity: jest.fn().mockResolvedValue(0),
  };
}

function makeStorage() {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://storage.example/report.pdf',
      remotePath: 'uploads/uuid-report.pdf',
    }),
    deleteFile: jest.fn(),
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

  repo.create.mockImplementation(async (doc: any) => doc);

  const handler = new UploadDocumentHandler(
    repo as any,
    storage as any,
    options as any,
    accessPort,
    eventBus as any,
  );
  return { handler, repo, storage, eventBus };
}

const BASE_COMMAND = new UploadDocumentCommand(
  Buffer.from('hello world'),
  'report.pdf',
  'application/pdf',
  [{ entityType: 'donation', entityId: 'entity-1' }],
  DocumentVisibility.Private,
  'user-1',
  ['write:docs'],
);

describe('UploadDocumentHandler', () => {
  it('uploads to storage, persists to repo, and returns a DocumentResponseDto', async () => {
    const { handler, repo, storage } = buildHandler();

    const result = await handler.execute(BASE_COMMAND);

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(DocumentResponseDto);
    expect(result.fileName).toBe('report.pdf');
    expect(result.contentType).toBe('application/pdf');
  });

  it('dispatches DocumentUploadedEvent after successful repo write', async () => {
    const { handler, repo, eventBus } = buildHandler();
    const createOrder: string[] = [];

    repo.create.mockImplementation(async (doc: any) => {
      createOrder.push('create');
      return doc;
    });
    eventBus.publishAll.mockImplementation(() => {
      createOrder.push('publishAll');
    });

    await handler.execute(BASE_COMMAND);

    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    const events = eventBus.publishAll.mock.calls[0][0];
    expect(events.some((e: any) => e instanceof DocumentUploadedEvent)).toBe(true);
    expect(createOrder.indexOf('create')).toBeLessThan(createOrder.indexOf('publishAll'));
  });

  it('throws FileSizeExceededError without calling storage when file is too large', async () => {
    const { handler, storage } = buildHandler({
      options: { ...DEFAULT_OPTIONS, maxFileSizeMb: 0.000001 },
    });

    await expect(
      handler.execute(
        new UploadDocumentCommand(
          Buffer.alloc(1000),
          'large.pdf',
          'application/pdf',
          [{ entityType: 'donation', entityId: 'entity-1' }],
          DocumentVisibility.Private,
          'user-1',
          ['write:docs'],
        ),
      ),
    ).rejects.toThrow(FileSizeExceededError);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('throws MimeTypeNotAllowedError without calling storage when MIME is disallowed', async () => {
    const { handler, storage } = buildHandler();

    await expect(
      handler.execute(
        new UploadDocumentCommand(
          Buffer.from('data'),
          'video.mp4',
          'video/mp4',
          [{ entityType: 'donation', entityId: 'entity-1' }],
          DocumentVisibility.Private,
          'user-1',
          ['write:docs'],
        ),
      ),
    ).rejects.toThrow(MimeTypeNotAllowedError);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('throws EntityTypeForbiddenError when entityType is not in the allowlist', async () => {
    const { handler, storage } = buildHandler();

    await expect(
      handler.execute(
        new UploadDocumentCommand(
          Buffer.from('data'),
          'report.pdf',
          'application/pdf',
          [{ entityType: 'invoice', entityId: 'entity-1' }],
          DocumentVisibility.Private,
          'user-1',
          ['write:docs'],
        ),
      ),
    ).rejects.toThrow(EntityTypeForbiddenError);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('respects document count limit per entity — throws when limit is reached', async () => {
    const repo = makeRepo();
    repo.countByEntity.mockResolvedValue(3);
    repo.create.mockImplementation(async (doc: any) => doc);

    const { handler, storage } = buildHandler({
      repo,
      options: {
        ...DEFAULT_OPTIONS,
        allowedEntityTypes: [
          {
            entityType: 'donation',
            writePermissions: ['write:docs'],
            maxDocumentsPerEntity: 3,
          } as any,
        ],
      },
    });

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(DocumentLimitReachedError);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('calls record-level accessPort.canAccess and throws if denied', async () => {
    const accessPort = { canAccess: jest.fn().mockResolvedValue(false) };
    const { handler, storage } = buildHandler({ accessPort });

    const { EntityAccessDeniedError } = await import('@ssdev-toolkit/nestjs-core');

    await expect(handler.execute(BASE_COMMAND)).rejects.toThrow(EntityAccessDeniedError);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('skips record-level access check when accessPort is null', async () => {
    const { handler } = buildHandler({ accessPort: null });

    await expect(handler.execute(BASE_COMMAND)).resolves.toBeDefined();
  });

  it('includes all mapping entries in the returned DTO', async () => {
    const { handler } = buildHandler();
    const command = new UploadDocumentCommand(
      Buffer.from('data'),
      'report.pdf',
      'application/pdf',
      [{ entityType: 'donation', entityId: 'entity-1' }],
      DocumentVisibility.Private,
      'user-1',
      ['write:docs'],
    );

    const dto = await handler.execute(command);

    expect(dto.mappings).toHaveLength(1);
    expect(dto.mappings[0].entityType).toBe('donation');
    expect(dto.mappings[0].entityId).toBe('entity-1');
  });
});
