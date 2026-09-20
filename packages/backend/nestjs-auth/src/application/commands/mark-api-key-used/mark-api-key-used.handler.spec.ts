import 'reflect-metadata';
import { MarkApiKeyUsedHandler } from './mark-api-key-used.handler';
import { MarkApiKeyUsedCommand } from './mark-api-key-used.command';
import { ApiKey } from '../../../domain/aggregates/api-key/api-key.aggregate';

const makeRepo = () => ({
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
  findByKeyId: jest.fn(),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

function makeApiKey(): ApiKey {
  return new ApiKey({
    id: 'key-id-1',
    key: 'hashed',
    keyId: 'abc123',
    name: 'test-key',
    permissions: [],
  });
}

describe('MarkApiKeyUsedHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: MarkApiKeyUsedHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new MarkApiKeyUsedHandler(repo as any, eventBus as any);
  });

  it('calls used(), persists and publishes events when the key exists', async () => {
    const key = makeApiKey();
    repo.findById.mockResolvedValue(key);

    const before = new Date();
    await handler.execute(new MarkApiKeyUsedCommand('key-id-1'));

    expect(key.lastUsedAt).toBeDefined();
    expect(key.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(repo.update).toHaveBeenCalledWith('key-id-1', key);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('silently returns without error when the key does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new MarkApiKeyUsedCommand('missing-id')),
    ).resolves.toBeUndefined();
    expect(repo.update).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });
});
