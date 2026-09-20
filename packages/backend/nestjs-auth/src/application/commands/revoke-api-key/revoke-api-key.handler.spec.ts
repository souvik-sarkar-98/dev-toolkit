import 'reflect-metadata';
import { RevokeApiKeyHandler } from './revoke-api-key.handler';
import { RevokeApiKeyCommand } from './revoke-api-key.command';
import { ApiKey } from '../../../domain/aggregates/api-key/api-key.aggregate';
import { ApiKeyNotFoundError } from '../../../domain/errors/auth.errors';

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

function makeApiKey(overrides: Partial<ConstructorParameters<typeof ApiKey>[0]> = {}): ApiKey {
  return new ApiKey({
    id: 'key-id-1',
    key: 'hashed',
    keyId: 'abc123',
    name: 'test-key',
    permissions: [],
    ...overrides,
  });
}

describe('RevokeApiKeyHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: RevokeApiKeyHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new RevokeApiKeyHandler(repo as any, eventBus as any);
  });

  it('revokes the key, persists and publishes events', async () => {
    const key = makeApiKey();
    repo.findById.mockResolvedValue(key);

    const result = await handler.execute(new RevokeApiKeyCommand('key-id-1'));

    expect(key.isExpired()).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('key-id-1', key);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('throws ApiKeyNotFoundError when the key does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new RevokeApiKeyCommand('missing-id')),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('still calls update when the key is already expired (revoke is a no-op on domain)', async () => {
    const past = new Date(Date.now() - 1);
    const key = makeApiKey({ expiresAt: past });
    repo.findById.mockResolvedValue(key);

    const result = await handler.execute(new RevokeApiKeyCommand('key-id-1'));

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });
});
