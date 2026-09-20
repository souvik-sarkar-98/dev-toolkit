import 'reflect-metadata';
import { ApiKey } from './api-key.aggregate';
import { ApiKeyCreatedEvent } from '../../events/api-key-created.event';
import { ApiKeyRevokedEvent } from '../../events/api-key-revoked.event';
import { ApiKeyUsedEvent } from '../../events/api-key-used.event';
import { ApiKeyPermissionsUpdatedEvent } from '../../events/api-key-permissions-updated.event';

describe('ApiKey aggregate', () => {
  describe('create()', () => {
    it('returns keyInfo and token', async () => {
      const { keyInfo, token } = await ApiKey.create({ name: 'test', permissions: [] });

      expect(keyInfo).toBeInstanceOf(ApiKey);
      expect(typeof token).toBe('string');
    });

    it('token starts with sk_ prefix', async () => {
      const { token } = await ApiKey.create({ name: 'test', permissions: [] });

      expect(token.startsWith('sk_')).toBe(true);
    });

    it('emits ApiKeyCreatedEvent', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: ['read:roles'] });

      expect(keyInfo.domainEvents).toHaveLength(1);
      expect(keyInfo.domainEvents[0]).toBeInstanceOf(ApiKeyCreatedEvent);
    });

    it('stores name and permissions', async () => {
      const { keyInfo } = await ApiKey.create({
        name: 'my-key',
        permissions: ['read:roles', 'read:permissions'],
        ownerId: 'owner-123',
        createdBy: 'user-abc',
      });

      expect(keyInfo.name).toBe('my-key');
      expect(keyInfo.permissions).toEqual(['read:roles', 'read:permissions']);
      expect(keyInfo.ownerId).toBe('owner-123');
      expect(keyInfo.createdBy).toBe('user-abc');
    });

    it('keyId can be extracted from the generated token', async () => {
      const { token } = await ApiKey.create({ name: 'test', permissions: [] });
      const keyId = ApiKey.fetchKeyId(token);

      expect(keyId).toBeTruthy();
      expect(keyId.length).toBeGreaterThan(0);
    });
  });

  describe('fetchKeyId()', () => {
    it('extracts the middle segment from a valid sk_ token', () => {
      const keyId = ApiKey.fetchKeyId('sk_myKeyId_someBase64Stuff');

      expect(keyId).toBe('myKeyId');
    });

    it('returns empty string for a token without sk_ prefix', () => {
      expect(ApiKey.fetchKeyId('invalid-token')).toBe('');
    });

    it('returns empty string for a token with only two parts', () => {
      expect(ApiKey.fetchKeyId('sk_onlytwoparts')).toBe('');
    });

    it('returns empty string for an empty string', () => {
      expect(ApiKey.fetchKeyId('')).toBe('');
    });
  });

  describe('isExpired()', () => {
    it('returns false when no expiresAt is set', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: [] });

      expect(keyInfo.isExpired()).toBe(false);
    });

    it('returns false when expiresAt is in the future', () => {
      const future = new Date(Date.now() + 60_000);
      const keyInfo = new ApiKey({
        id: 'id-1',
        key: 'hash',
        keyId: 'kid',
        name: 'test',
        permissions: [],
        expiresAt: future,
      });

      expect(keyInfo.isExpired()).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
      const past = new Date(Date.now() - 1);
      const keyInfo = new ApiKey({
        id: 'id-1',
        key: 'hash',
        keyId: 'kid',
        name: 'test',
        permissions: [],
        expiresAt: past,
      });

      expect(keyInfo.isExpired()).toBe(true);
    });
  });

  describe('revoke()', () => {
    it('sets expiresAt to the past so isExpired() becomes true', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: [] });
      keyInfo.clearEvents();

      keyInfo.revoke();

      expect(keyInfo.isExpired()).toBe(true);
    });

    it('emits ApiKeyRevokedEvent', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: [] });
      keyInfo.clearEvents();

      keyInfo.revoke();

      expect(keyInfo.domainEvents).toHaveLength(1);
      expect(keyInfo.domainEvents[0]).toBeInstanceOf(ApiKeyRevokedEvent);
    });

    it('is a no-op when already expired (does not emit another event)', async () => {
      const past = new Date(Date.now() - 1);
      const keyInfo = new ApiKey({
        id: 'id-1',
        key: 'hash',
        keyId: 'kid',
        name: 'test',
        permissions: [],
        expiresAt: past,
      });

      keyInfo.revoke();

      expect(keyInfo.domainEvents).toHaveLength(0);
    });
  });

  describe('used()', () => {
    it('updates lastUsedAt', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: [] });
      keyInfo.clearEvents();

      const before = new Date();
      keyInfo.used();

      expect(keyInfo.lastUsedAt).toBeDefined();
      expect(keyInfo.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('emits ApiKeyUsedEvent', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: [] });
      keyInfo.clearEvents();

      keyInfo.used();

      expect(keyInfo.domainEvents).toHaveLength(1);
      expect(keyInfo.domainEvents[0]).toBeInstanceOf(ApiKeyUsedEvent);
    });
  });

  describe('updatePermissions()', () => {
    it('replaces the permission list', async () => {
      const { keyInfo } = await ApiKey.create({
        name: 'test',
        permissions: ['read:roles'],
      });
      keyInfo.clearEvents();

      keyInfo.updatePermissions(['read:permissions', 'create:api_keys']);

      expect(keyInfo.permissions).toEqual(['read:permissions', 'create:api_keys']);
    });

    it('emits ApiKeyPermissionsUpdatedEvent', async () => {
      const { keyInfo } = await ApiKey.create({ name: 'test', permissions: ['read:roles'] });
      keyInfo.clearEvents();

      keyInfo.updatePermissions([]);

      expect(keyInfo.domainEvents).toHaveLength(1);
      expect(keyInfo.domainEvents[0]).toBeInstanceOf(ApiKeyPermissionsUpdatedEvent);
    });
  });
});
