import 'reflect-metadata';
import { GetJsonDocumentHandler } from './get-json-document.handler';
import { GetJsonDocumentQuery } from './get-json-document.query';
import {
  JsonDocumentNotFoundError,
  JsonDocumentKeyNotFoundError,
} from '../../../domain/errors/json-store.errors';
import { JsonDocument } from '../../../domain/aggregates/json-document.aggregate';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeRepo = () => ({
  findById: jest.fn(),
  findByKey: jest.fn(),
  findByNamespace: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

function makeDoc(id = 'doc-uuid-1'): JsonDocument {
  return new JsonDocument(
    id,
    'welcome-email',
    'correspondence',
    { subject: 'Hello' },
    new Date('2026-01-01'),
    new Date('2026-06-01'),
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('GetJsonDocumentHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let handler: GetJsonDocumentHandler;

  beforeEach(() => {
    repo = makeRepo();
    handler = new GetJsonDocumentHandler(repo as any);
  });

  describe('lookup by id', () => {
    it('returns the DTO when the document exists', async () => {
      repo.findById.mockResolvedValue(makeDoc('doc-uuid-1'));

      const result = await handler.execute(new GetJsonDocumentQuery({ id: 'doc-uuid-1' }));

      expect(result.id).toBe('doc-uuid-1');
      expect(result.key).toBe('welcome-email');
      expect(result.namespace).toBe('correspondence');
      expect(result.payload).toEqual({ subject: 'Hello' });
    });

    it('calls repo.findById with the supplied id', async () => {
      repo.findById.mockResolvedValue(makeDoc());

      await handler.execute(new GetJsonDocumentQuery({ id: 'doc-uuid-1' }));

      expect(repo.findById).toHaveBeenCalledWith('doc-uuid-1');
      expect(repo.findByKey).not.toHaveBeenCalled();
    });

    it('throws JsonDocumentNotFoundError when id does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new GetJsonDocumentQuery({ id: 'missing' })),
      ).rejects.toThrow(JsonDocumentNotFoundError);
    });
  });

  describe('lookup by key + namespace', () => {
    it('returns the DTO when the document exists', async () => {
      repo.findByKey.mockResolvedValue(makeDoc());

      const result = await handler.execute(
        new GetJsonDocumentQuery({ key: 'welcome-email', namespace: 'correspondence' }),
      );

      expect(result.key).toBe('welcome-email');
      expect(result.namespace).toBe('correspondence');
    });

    it('calls repo.findByKey with the supplied key and namespace', async () => {
      repo.findByKey.mockResolvedValue(makeDoc());

      await handler.execute(
        new GetJsonDocumentQuery({ key: 'welcome-email', namespace: 'correspondence' }),
      );

      expect(repo.findByKey).toHaveBeenCalledWith('welcome-email', 'correspondence');
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it('throws JsonDocumentKeyNotFoundError when key+namespace does not exist', async () => {
      repo.findByKey.mockResolvedValue(null);

      await expect(
        handler.execute(
          new GetJsonDocumentQuery({ key: 'missing-key', namespace: 'correspondence' }),
        ),
      ).rejects.toThrow(JsonDocumentKeyNotFoundError);
    });
  });
});
