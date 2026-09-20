import 'reflect-metadata';
import { ApiKeyResponseMapper } from './api-key-response.mapper';
import { ApiKey } from '../../domain/aggregates/api-key/api-key.aggregate';

function makeApiKey(overrides: Partial<ConstructorParameters<typeof ApiKey>[0]> = {}): ApiKey {
  return new ApiKey({
    id: 'key-id-1',
    key: 'hashed-secret',
    keyId: 'abc123',
    name: 'my-key',
    permissions: ['read:roles', 'read:permissions'],
    expiresAt: new Date('2030-01-01'),
    lastUsedAt: new Date('2026-06-01'),
    createdBy: 'creator|1',
    ownerId: 'owner|1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  });
}

describe('ApiKeyResponseMapper', () => {
  describe('toDto()', () => {
    it('maps all scalar fields from the aggregate', () => {
      const apiKey = makeApiKey();

      const dto = ApiKeyResponseMapper.toDto(apiKey);

      expect(dto.id).toBe('key-id-1');
      expect(dto.name).toBe('my-key');
      expect(dto.permissions).toEqual(['read:roles', 'read:permissions']);
      expect(dto.expiresAt).toEqual(new Date('2030-01-01'));
      expect(dto.lastUsedAt).toEqual(new Date('2026-06-01'));
      expect(dto.createdAt).toEqual(new Date('2026-01-01'));
      expect(dto.updatedAt).toEqual(new Date('2026-06-01'));
    });

    it('attaches the token when provided', () => {
      const apiKey = makeApiKey();

      const dto = ApiKeyResponseMapper.toDto(apiKey, 'sk_kid_rawtoken');

      expect(dto.token).toBe('sk_kid_rawtoken');
    });

    it('leaves token undefined when not provided', () => {
      const apiKey = makeApiKey();

      const dto = ApiKeyResponseMapper.toDto(apiKey);

      expect(dto.token).toBeUndefined();
    });

    it('maps ownerId via ownerId field', () => {
      const apiKey = makeApiKey({ ownerId: 'owner|999' });

      const dto = ApiKeyResponseMapper.toDto(apiKey);

      // ownerId is undefined because apiKey.ownerId doesn't exist — it's ownerId
      expect(dto.ownerId).toBe('owner|999');
    });

    it('handles optional fields as undefined gracefully', () => {
      const apiKey = makeApiKey({ expiresAt: undefined, lastUsedAt: undefined, ownerId: undefined });

      const dto = ApiKeyResponseMapper.toDto(apiKey);

      expect(dto.expiresAt).toBeUndefined();
      expect(dto.lastUsedAt).toBeUndefined();
    });
  });
});
