import 'reflect-metadata';
import { UpdateJsonDocumentHandler } from './update-json-document.handler';
import { UpdateJsonDocumentCommand } from './update-json-document.command';
import { JsonDocumentNotFoundError } from '../../../domain/errors/json-store.errors';
import { JsonDocument } from '../../../domain/aggregates/json-document.aggregate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeRepo = () => ({
  findById: jest.fn(),
  findByKey: jest.fn(),
  findByNamespace: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

const makeValidator = () => ({ validate: jest.fn() });

function makeExistingDoc(): JsonDocument {
  return new JsonDocument(
    'doc-uuid-1',
    'welcome-email',
    'correspondence',
    { subject: 'Old subject' },
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('UpdateJsonDocumentHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let validator: ReturnType<typeof makeValidator>;
  let handler: UpdateJsonDocumentHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    validator = makeValidator();
    handler = new UpdateJsonDocumentHandler(repo as any, validator as any, eventBus as any);
  });

  describe('success path', () => {
    it('returns a DTO with the updated payload', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      const result = await handler.execute(
        new UpdateJsonDocumentCommand({ id: 'doc-uuid-1', payload: { subject: 'New subject' } }),
      );

      expect(result.id).toBe('doc-uuid-1');
      expect(result.payload).toEqual({ subject: 'New subject' });
    });

    it('calls repo.findById with the supplied id', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(
        new UpdateJsonDocumentCommand({ id: 'doc-uuid-1', payload: {} }),
      );

      expect(repo.findById).toHaveBeenCalledWith('doc-uuid-1');
    });

    it('persists the updated document via repo.update', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(
        new UpdateJsonDocumentCommand({ id: 'doc-uuid-1', payload: { x: 1 } }),
      );

      expect(repo.update).toHaveBeenCalledTimes(1);
      const [id, entity] = repo.update.mock.calls[0];
      expect(id).toBe('doc-uuid-1');
      expect(entity).toBeInstanceOf(JsonDocument);
    });

    it('publishes domain events after the repo write', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(
        new UpdateJsonDocumentCommand({ id: 'doc-uuid-1', payload: {} }),
      );

      expect(repo.update).toHaveBeenCalledTimes(1);
      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);

      const updateOrder = repo.update.mock.invocationCallOrder[0];
      const publishOrder = eventBus.publishAll.mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(publishOrder);
    });

    it('publishes the JsonDocumentUpdatedEvent', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(
        new UpdateJsonDocumentCommand({ id: 'doc-uuid-1', payload: {} }),
      );

      const [events] = eventBus.publishAll.mock.calls[0];
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('JsonDocumentUpdatedEvent');
    });
  });

  describe('error path', () => {
    it('throws JsonDocumentNotFoundError when id does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new UpdateJsonDocumentCommand({ id: 'missing', payload: {} })),
      ).rejects.toThrow(JsonDocumentNotFoundError);
    });

    it('does not call repo.update when document is not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new UpdateJsonDocumentCommand({ id: 'missing', payload: {} })),
      ).rejects.toThrow();

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('does not publish events when document is not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new UpdateJsonDocumentCommand({ id: 'missing', payload: {} })),
      ).rejects.toThrow();

      expect(eventBus.publishAll).not.toHaveBeenCalled();
    });
  });
});
