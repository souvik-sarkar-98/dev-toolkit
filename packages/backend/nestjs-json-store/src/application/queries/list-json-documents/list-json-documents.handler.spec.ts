import 'reflect-metadata';
import { ListJsonDocumentsHandler } from './list-json-documents.handler';
import { ListJsonDocumentsQuery } from './list-json-documents.query';
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

function makeDoc(id: string, key: string, namespace: string): JsonDocument {
  return new JsonDocument(
    id,
    key,
    namespace,
    { value: key },
    new Date('2026-01-01'),
    new Date('2026-01-01'),
  );
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('ListJsonDocumentsHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let handler: ListJsonDocumentsHandler;

  beforeEach(() => {
    repo = makeRepo();
    handler = new ListJsonDocumentsHandler(repo as any);
  });

  describe('when no namespace filter is provided', () => {
    it('calls repo.findAll and returns all documents mapped to DTOs', async () => {
      const docs = [
        makeDoc('id-1', 'key-a', 'ns-a'),
        makeDoc('id-2', 'key-b', 'ns-b'),
      ];
      repo.findAll.mockResolvedValue(docs);

      const result = await handler.execute(new ListJsonDocumentsQuery({}));

      expect(repo.findAll).toHaveBeenCalledTimes(1);
      expect(repo.findByNamespace).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when no documents exist', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await handler.execute(new ListJsonDocumentsQuery({}));

      expect(result).toEqual([]);
    });

    it('maps each document to a correct DTO', async () => {
      repo.findAll.mockResolvedValue([makeDoc('id-1', 'key-a', 'ns-a')]);

      const [dto] = await handler.execute(new ListJsonDocumentsQuery({}));

      expect(dto.id).toBe('id-1');
      expect(dto.key).toBe('key-a');
      expect(dto.namespace).toBe('ns-a');
      expect(dto.payload).toEqual({ value: 'key-a' });
    });
  });

  describe('when a namespace filter is provided', () => {
    it('calls repo.findByNamespace with the namespace string', async () => {
      repo.findByNamespace.mockResolvedValue([]);

      await handler.execute(new ListJsonDocumentsQuery({ namespace: 'correspondence' }));

      expect(repo.findByNamespace).toHaveBeenCalledWith('correspondence');
      expect(repo.findAll).not.toHaveBeenCalled();
    });

    it('returns only the documents in the given namespace', async () => {
      const docs = [
        makeDoc('id-1', 'email-a', 'correspondence'),
        makeDoc('id-2', 'email-b', 'correspondence'),
      ];
      repo.findByNamespace.mockResolvedValue(docs);

      const result = await handler.execute(
        new ListJsonDocumentsQuery({ namespace: 'correspondence' }),
      );

      expect(result).toHaveLength(2);
      result.forEach((dto) => expect(dto.namespace).toBe('correspondence'));
    });

    it('returns an empty array when the namespace has no documents', async () => {
      repo.findByNamespace.mockResolvedValue([]);

      const result = await handler.execute(
        new ListJsonDocumentsQuery({ namespace: 'empty-ns' }),
      );

      expect(result).toEqual([]);
    });
  });
});
