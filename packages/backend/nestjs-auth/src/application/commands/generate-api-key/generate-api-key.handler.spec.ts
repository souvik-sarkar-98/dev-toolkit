import 'reflect-metadata';
import { GenerateApiKeyHandler } from './generate-api-key.handler';
import { GenerateApiKeyCommand } from './generate-api-key.command';
import { ApiKeyNotFoundError, InsufficientPermissionsError } from '../../../domain/errors/auth.errors';
import { ApiKey } from '../../../domain/aggregates/api-key/api-key.aggregate';

const makeRepo = () => ({
  findById: jest.fn(),
  findByKeyId: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

describe('GenerateApiKeyHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: GenerateApiKeyHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new GenerateApiKeyHandler(repo as any, eventBus as any);
  });

  it('creates a key, persists it and returns a DTO with token when no ownerId', async () => {
    const command = new GenerateApiKeyCommand(
      'my-key',
      ['read:roles'],
      ['read:roles'],
      'creator|123',
    );

    const result = await handler.execute(command);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result.name).toBe('my-key');
    expect(result.token).toBeDefined();
    expect(result.token!.startsWith('sk_')).toBe(true);
  });

  it('succeeds with ownerId when caller has all requested permissions', async () => {
    const command = new GenerateApiKeyCommand(
      'delegated-key',
      ['read:roles'],
      ['read:roles', 'create:api_keys'],
      'creator|123',
      undefined,
      'owner|456',
    );

    const result = await handler.execute(command);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(result.token).toBeDefined();
  });

  it('throws InsufficientPermissionsError with ownerId when caller lacks permissions', async () => {
    const command = new GenerateApiKeyCommand(
      'delegated-key',
      ['delete:api_keys'],
      ['read:roles'],
      'creator|123',
      undefined,
      'owner|456',
    );

    await expect(handler.execute(command)).rejects.toThrow(InsufficientPermissionsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('stores the expiresAt when provided', async () => {
    const expiresAt = new Date(Date.now() + 3_600_000);
    const command = new GenerateApiKeyCommand(
      'expiring-key',
      [],
      [],
      'creator|123',
      expiresAt,
    );

    const result = await handler.execute(command);

    expect(result.expiresAt).toEqual(expiresAt);
  });
});
