import 'reflect-metadata';
import { JsonStoreFacade } from './json-store.facade';
import { CreateJsonDocumentCommand } from '../commands/create-json-document/create-json-document.command';
import { UpdateJsonDocumentCommand } from '../commands/update-json-document/update-json-document.command';
import { UpsertJsonDocumentCommand } from '../commands/upsert-json-document/upsert-json-document.command';
import { DeleteJsonDocumentCommand } from '../commands/delete-json-document/delete-json-document.command';
import { GetJsonDocumentQuery } from '../queries/get-json-document/get-json-document.query';
import { ListJsonDocumentsQuery } from '../queries/list-json-documents/list-json-documents.query';
import { JsonDocumentKeyNotFoundError } from '../../domain/errors/json-store.errors';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeCommandBus = () => ({ execute: jest.fn() });
const makeQueryBus = () => ({ execute: jest.fn() });

const sampleDto = {
  id: 'uuid-1',
  key: 'welcome-email',
  namespace: 'correspondence',
  payload: { subject: 'Hi' },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-06-01'),
};

// ─── tests ────────────────────────────────────────────────────────────────────

describe('JsonStoreFacade', () => {
  let commandBus: ReturnType<typeof makeCommandBus>;
  let queryBus: ReturnType<typeof makeQueryBus>;
  let facade: JsonStoreFacade;

  beforeEach(() => {
    commandBus = makeCommandBus();
    queryBus = makeQueryBus();
    facade = new JsonStoreFacade(commandBus as any, queryBus as any);
  });

  describe('create()', () => {
    it('dispatches CreateJsonDocumentCommand with correct params', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      await facade.create('welcome-email', 'correspondence', { subject: 'Hi' });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateJsonDocumentCommand),
      );
      const cmd = commandBus.execute.mock.calls[0][0] as CreateJsonDocumentCommand;
      expect(cmd.params.key).toBe('welcome-email');
      expect(cmd.params.namespace).toBe('correspondence');
      expect(cmd.params.payload).toEqual({ subject: 'Hi' });
    });

    it('returns the DTO from the command bus', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.create('welcome-email', 'correspondence', {});

      expect(result).toBe(sampleDto);
    });
  });

  describe('upsert()', () => {
    it('dispatches UpsertJsonDocumentCommand with correct params', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      await facade.upsert('welcome-email', 'correspondence', { subject: 'Hi' });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpsertJsonDocumentCommand),
      );
      const cmd = commandBus.execute.mock.calls[0][0] as UpsertJsonDocumentCommand;
      expect(cmd.params.key).toBe('welcome-email');
      expect(cmd.params.namespace).toBe('correspondence');
    });

    it('returns the DTO from the command bus', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.upsert('welcome-email', 'correspondence', {});

      expect(result).toBe(sampleDto);
    });
  });

  describe('update()', () => {
    it('dispatches UpdateJsonDocumentCommand with correct params', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      await facade.update('uuid-1', { subject: 'Updated' });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateJsonDocumentCommand),
      );
      const cmd = commandBus.execute.mock.calls[0][0] as UpdateJsonDocumentCommand;
      expect(cmd.params.id).toBe('uuid-1');
      expect(cmd.params.payload).toEqual({ subject: 'Updated' });
    });

    it('returns the DTO from the command bus', async () => {
      commandBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.update('uuid-1', {});

      expect(result).toBe(sampleDto);
    });
  });

  describe('delete()', () => {
    it('dispatches DeleteJsonDocumentCommand with the correct id', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await facade.delete('uuid-1');

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(DeleteJsonDocumentCommand),
      );
      const cmd = commandBus.execute.mock.calls[0][0] as DeleteJsonDocumentCommand;
      expect(cmd.params.id).toBe('uuid-1');
    });
  });

  describe('get()', () => {
    it('dispatches GetJsonDocumentQuery with key and namespace', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      await facade.get('welcome-email', 'correspondence');

      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetJsonDocumentQuery));
      const query = queryBus.execute.mock.calls[0][0] as GetJsonDocumentQuery;
      expect(query.params.key).toBe('welcome-email');
      expect((query.params as any).namespace).toBe('correspondence');
    });

    it('returns the payload from the DTO on success', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.get('welcome-email', 'correspondence');

      expect(result).toEqual({ subject: 'Hi' });
    });

    it('returns null when the query throws (document not found)', async () => {
      queryBus.execute.mockRejectedValue(
        new JsonDocumentKeyNotFoundError('missing', 'ns'),
      );

      const result = await facade.get('missing', 'ns');

      expect(result).toBeNull();
    });
  });

  describe('getDto()', () => {
    it('dispatches GetJsonDocumentQuery with key and namespace', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      await facade.getDto('welcome-email', 'correspondence');

      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetJsonDocumentQuery));
    });

    it('returns the full DTO on success', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.getDto('welcome-email', 'correspondence');

      expect(result).toBe(sampleDto);
    });

    it('returns null when the query throws', async () => {
      queryBus.execute.mockRejectedValue(
        new JsonDocumentKeyNotFoundError('missing', 'ns'),
      );

      const result = await facade.getDto('missing', 'ns');

      expect(result).toBeNull();
    });
  });

  describe('getById()', () => {
    it('dispatches GetJsonDocumentQuery with id', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      await facade.getById('uuid-1');

      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetJsonDocumentQuery));
      const query = queryBus.execute.mock.calls[0][0] as GetJsonDocumentQuery;
      expect(query.params.id).toBe('uuid-1');
    });

    it('returns the DTO from the query bus', async () => {
      queryBus.execute.mockResolvedValue(sampleDto);

      const result = await facade.getById('uuid-1');

      expect(result).toBe(sampleDto);
    });
  });

  describe('list()', () => {
    it('dispatches ListJsonDocumentsQuery without namespace when called with no args', async () => {
      queryBus.execute.mockResolvedValue([sampleDto]);

      await facade.list();

      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListJsonDocumentsQuery));
      const query = queryBus.execute.mock.calls[0][0] as ListJsonDocumentsQuery;
      expect(query.params.namespace).toBeUndefined();
    });

    it('dispatches ListJsonDocumentsQuery with the namespace when provided', async () => {
      queryBus.execute.mockResolvedValue([sampleDto]);

      await facade.list('correspondence');

      const query = queryBus.execute.mock.calls[0][0] as ListJsonDocumentsQuery;
      expect(query.params.namespace).toBe('correspondence');
    });

    it('returns the DTO array from the query bus', async () => {
      queryBus.execute.mockResolvedValue([sampleDto]);

      const result = await facade.list();

      expect(result).toEqual([sampleDto]);
    });
  });
});
