import 'reflect-metadata';
import { CreateJsonDocumentHandler } from './create-json-document.handler';
import { CreateJsonDocumentCommand } from './create-json-document.command';
import { JsonDocumentAlreadyExistsError } from '../../../domain/errors/json-store.errors';
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

const defaultCommand = () =>
  new CreateJsonDocumentCommand({
    key: 'welcome-email',
    namespace: 'correspondence',
    payload: { subject: 'Hello' },
  });

// ─── tests ────────────────────────────────────────────────────────────────────

describe('CreateJsonDocumentHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let validator: ReturnType<typeof makeValidator>;
  let handler: CreateJsonDocumentHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    validator = makeValidator();
    handler = new CreateJsonDocumentHandler(repo as any, validator as any, eventBus as any);
  });

  describe('success path', () => {
    it('returns a JsonDocumentResponseDto with correct fields', async () => {
      repo.findByKey.mockResolvedValue(null);

      const result = await handler.execute(defaultCommand());

      expect(result.key).toBe('welcome-email');
      expect(result.namespace).toBe('correspondence');
      expect(result.payload).toEqual({ subject: 'Hello' });
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('checks for an existing document before creating', async () => {
      repo.findByKey.mockResolvedValue(null);

      await handler.execute(defaultCommand());

      expect(repo.findByKey).toHaveBeenCalledWith('welcome-email', 'correspondence');
    });

    it('persists the new document via repo.create', async () => {
      repo.findByKey.mockResolvedValue(null);

      await handler.execute(defaultCommand());

      expect(repo.create).toHaveBeenCalledTimes(1);
      const persisted = repo.create.mock.calls[0][0];
      expect(persisted).toBeInstanceOf(JsonDocument);
    });

    it('publishes domain events after the repo write', async () => {
      repo.findByKey.mockResolvedValue(null);

      await handler.execute(defaultCommand());

      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(eventBus.publishAll).toHaveBeenCalledTimes(1);

      const createOrder = repo.create.mock.invocationCallOrder[0];
      const publishOrder = eventBus.publishAll.mock.invocationCallOrder[0];
      expect(createOrder).toBeLessThan(publishOrder);
    });

    it('publishes the JsonDocumentCreatedEvent', async () => {
      repo.findByKey.mockResolvedValue(null);

      await handler.execute(defaultCommand());

      const [events] = eventBus.publishAll.mock.calls[0];
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe('JsonDocumentCreatedEvent');
    });
  });

  describe('error path', () => {
    it('throws JsonDocumentAlreadyExistsError when key+namespace already exists', async () => {
      repo.findByKey.mockResolvedValue({ id: 'existing-id' });

      await expect(handler.execute(defaultCommand())).rejects.toThrow(
        JsonDocumentAlreadyExistsError,
      );
    });

    it('does not call repo.create when document already exists', async () => {
      repo.findByKey.mockResolvedValue({ id: 'existing-id' });

      await expect(handler.execute(defaultCommand())).rejects.toThrow();

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('does not publish events when document already exists', async () => {
      repo.findByKey.mockResolvedValue({ id: 'existing-id' });

      await expect(handler.execute(defaultCommand())).rejects.toThrow();

      expect(eventBus.publishAll).not.toHaveBeenCalled();
    });
  });
});
