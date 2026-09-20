import 'reflect-metadata';
import { DeleteJsonDocumentHandler } from './delete-json-document.handler';
import { DeleteJsonDocumentCommand } from './delete-json-document.command';
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

function makeExistingDoc(): JsonDocument {
  return new JsonDocument(
    'doc-uuid-1',
    'invoice-template',
    'billing',
    { amount: 100 },
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('DeleteJsonDocumentHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: DeleteJsonDocumentHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new DeleteJsonDocumentHandler(repo as any, eventBus as any);
  });

  describe('success path', () => {
    it('returns void on success', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      const result = await handler.execute(new DeleteJsonDocumentCommand({ id: 'doc-uuid-1' }));

      expect(result).toBeUndefined();
    });

    it('calls repo.findById with the supplied id', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(new DeleteJsonDocumentCommand({ id: 'doc-uuid-1' }));

      expect(repo.findById).toHaveBeenCalledWith('doc-uuid-1');
    });

    it('calls repo.delete with the document id', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(new DeleteJsonDocumentCommand({ id: 'doc-uuid-1' }));

      expect(repo.delete).toHaveBeenCalledWith('doc-uuid-1');
    });

    it('publishes domain events after the repo delete', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(new DeleteJsonDocumentCommand({ id: 'doc-uuid-1' }));

      expect(repo.delete).toHaveBeenCalledTimes(1);
      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);

      const deleteOrder = repo.delete.mock.invocationCallOrder[0];
      const publishOrder = eventBus.publishAll.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(publishOrder);
    });

    it('publishes a JsonDocumentDeletedEvent', async () => {
      repo.findById.mockResolvedValue(makeExistingDoc());

      await handler.execute(new DeleteJsonDocumentCommand({ id: 'doc-uuid-1' }));

      const [events] = eventBus.publishAll.mock.calls[0];
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('JsonDocumentDeletedEvent');
    });
  });

  describe('error path', () => {
    it('throws JsonDocumentNotFoundError when id does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteJsonDocumentCommand({ id: 'missing' })),
      ).rejects.toThrow(JsonDocumentNotFoundError);
    });

    it('does not call repo.delete when document is not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteJsonDocumentCommand({ id: 'missing' })),
      ).rejects.toThrow();

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('does not publish events when document is not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteJsonDocumentCommand({ id: 'missing' })),
      ).rejects.toThrow();

      expect(eventBus.publishAll).not.toHaveBeenCalled();
    });
  });
});
