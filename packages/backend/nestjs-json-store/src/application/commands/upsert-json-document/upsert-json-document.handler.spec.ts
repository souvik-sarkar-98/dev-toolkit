import 'reflect-metadata';
import { UpsertJsonDocumentHandler } from './upsert-json-document.handler';
import { UpsertJsonDocumentCommand } from './upsert-json-document.command';
import { JsonDocument } from '../../../domain/aggregates/json-document.aggregate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeRepo = () => ({
  findById: jest.fn(),
  findByKey: jest.fn(),
  findByNamespace: jest.fn(),
  upsertByKey: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

const makeValidator = () => ({ validate: jest.fn() });

function makeDoc(
  id: string,
  payload: Record<string, unknown> = { subject: 'Value' },
): JsonDocument {
  return new JsonDocument(
    id,
    'welcome-email',
    'correspondence',
    payload,
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );
}

const defaultCommand = (payload: Record<string, unknown> = { subject: 'New' }) =>
  new UpsertJsonDocumentCommand({
    key: 'welcome-email',
    namespace: 'correspondence',
    payload,
  });

// ─── tests ────────────────────────────────────────────────────────────────────

describe('UpsertJsonDocumentHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let validator: ReturnType<typeof makeValidator>;
  let handler: UpsertJsonDocumentHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    validator = makeValidator();
    handler = new UpsertJsonDocumentHandler(repo as any, validator as any, eventBus as any);
  });

  describe('when the document does not yet exist (create path)', () => {
    beforeEach(() => {
      repo.upsertByKey.mockResolvedValue({
        document: makeDoc('new-id', { subject: 'New' }),
        wasCreated: true,
        payloadChanged: true,
      });
    });

    it('creates a new document and returns the DTO', async () => {
      const result = await handler.execute(defaultCommand());

      expect(result.key).toBe('welcome-email');
      expect(result.namespace).toBe('correspondence');
      expect(result.payload).toEqual({ subject: 'New' });
    });

    it('calls repo.upsertByKey with the correct arguments', async () => {
      await handler.execute(defaultCommand());

      expect(repo.upsertByKey).toHaveBeenCalledTimes(1);
      expect(repo.upsertByKey).toHaveBeenCalledWith(
        'welcome-email',
        'correspondence',
        { subject: 'New' },
      );
    });

    it('does not call repo.create or repo.update directly', async () => {
      await handler.execute(defaultCommand());

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('publishes events after the repo write', async () => {
      await handler.execute(defaultCommand());

      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);

      const upsertOrder = repo.upsertByKey.mock.invocationCallOrder[0];
      const publishOrder = eventBus.publishAll.mock.invocationCallOrder[0];
      expect(upsertOrder).toBeLessThan(publishOrder);
    });

    it('publishes a JsonDocumentCreatedEvent', async () => {
      await handler.execute(defaultCommand());

      const [events] = eventBus.publishAll.mock.calls[0];
      expect(events[0].constructor.name).toBe('JsonDocumentCreatedEvent');
    });
  });

  describe('when the document already exists with a changed payload (update path)', () => {
    beforeEach(() => {
      repo.upsertByKey.mockResolvedValue({
        document: makeDoc('existing-id', { subject: 'Updated' }),
        wasCreated: false,
        payloadChanged: true,
      });
    });

    it('updates the existing document and returns the DTO', async () => {
      const result = await handler.execute(defaultCommand({ subject: 'Updated' }));

      expect(result.id).toBe('existing-id');
      expect(result.payload).toEqual({ subject: 'Updated' });
    });

    it('does not call repo.create or repo.update directly', async () => {
      await handler.execute(defaultCommand({ subject: 'Updated' }));

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('publishes events after the repo write', async () => {
      await handler.execute(defaultCommand({ subject: 'Updated' }));

      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);

      const upsertOrder = repo.upsertByKey.mock.invocationCallOrder[0];
      const publishOrder = eventBus.publishAll.mock.invocationCallOrder[0];
      expect(upsertOrder).toBeLessThan(publishOrder);
    });

    it('publishes a JsonDocumentUpdatedEvent', async () => {
      await handler.execute(defaultCommand({ subject: 'Updated' }));

      const [events] = eventBus.publishAll.mock.calls[0];
      expect(events[0].constructor.name).toBe('JsonDocumentUpdatedEvent');
    });
  });

  describe('when the document already exists with an unchanged payload (LOW-1: skip event)', () => {
    beforeEach(() => {
      repo.upsertByKey.mockResolvedValue({
        document: makeDoc('existing-id', { subject: 'Same' }),
        wasCreated: false,
        payloadChanged: false,
      });
    });

    it('returns the document DTO', async () => {
      const result = await handler.execute(defaultCommand({ subject: 'Same' }));

      expect(result.id).toBe('existing-id');
      expect(result.payload).toEqual({ subject: 'Same' });
    });

    it('does not publish any events when payload is unchanged', async () => {
      await handler.execute(defaultCommand({ subject: 'Same' }));

      expect(eventBus.publishAll).not.toHaveBeenCalled();
    });
  });
});
