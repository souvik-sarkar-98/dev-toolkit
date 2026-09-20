import 'reflect-metadata';
import { UpdateApiKeyPermissionsHandler } from './update-api-key-permissions.handler';
import { UpdateApiKeyPermissionsCommand } from './update-api-key-permissions.command';
import { ApiKey } from '../../../domain/aggregates/api-key/api-key.aggregate';
import { ApiKeyNotFoundError, InsufficientPermissionsError } from '../../../domain/errors/auth.errors';

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
    permissions: ['read:roles'],
    ...overrides,
  });
}

describe('UpdateApiKeyPermissionsHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: UpdateApiKeyPermissionsHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new UpdateApiKeyPermissionsHandler(repo as any, eventBus as any);
  });

  it('replaces permissions, persists and returns updated DTO', async () => {
    const key = makeApiKey();
    repo.findById.mockResolvedValue(key);

    const result = await handler.execute(
      new UpdateApiKeyPermissionsCommand('key-id-1', ['read:permissions'], ['read:permissions']),
    );

    expect(key.permissions).toEqual(['read:permissions']);
    expect(repo.update).toHaveBeenCalledWith('key-id-1', key);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result.permissions).toEqual(['read:permissions']);
  });

  it('throws ApiKeyNotFoundError when the key does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      handler.execute(
        new UpdateApiKeyPermissionsCommand('missing-id', [], []),
      ),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('applies permission delegation policy when the key has an ownerId', async () => {
    const key = makeApiKey({ ownerId: 'owner|123' });
    repo.findById.mockResolvedValue(key);

    await expect(
      handler.execute(
        new UpdateApiKeyPermissionsCommand('key-id-1', ['delete:api_keys'], ['read:roles']),
      ),
    ).rejects.toThrow(InsufficientPermissionsError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('skips policy when the key has no ownerId', async () => {
    const key = makeApiKey({ ownerId: undefined });
    repo.findById.mockResolvedValue(key);

    await expect(
      handler.execute(
        new UpdateApiKeyPermissionsCommand('key-id-1', ['delete:api_keys'], ['read:roles']),
      ),
    ).resolves.toBeDefined();
  });
});
