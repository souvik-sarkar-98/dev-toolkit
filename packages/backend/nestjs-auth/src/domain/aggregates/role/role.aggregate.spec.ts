import 'reflect-metadata';
import { Role } from './role.aggregate';

describe('Role aggregate', () => {
  describe('create()', () => {
    it('creates a Role with the given key and description', () => {
      const role = Role.create({ key: 'admin', description: 'Administrator role' });

      expect(role).toBeInstanceOf(Role);
      expect(role.key).toBe('admin');
      expect(role.description).toBe('Administrator role');
    });

    it('starts with empty permissionKeys', () => {
      const role = Role.create({ key: 'admin' });

      expect(role.permissionKeys).toEqual([]);
    });

    it('is not deleted on creation', () => {
      const role = Role.create({ key: 'admin' });

      expect(role.isDeleted()).toBe(false);
      expect(role.deletedAt).toBeUndefined();
    });

    it('assigns a UUID id', () => {
      const role = Role.create({ key: 'admin' });

      expect(role.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('withPermissionKeys()', () => {
    it('replaces the permission key list', () => {
      const role = Role.create({ key: 'admin' });

      role.withPermissionKeys(['read:roles', 'create:api_keys']);

      expect(role.permissionKeys).toEqual(['read:roles', 'create:api_keys']);
    });

    it('can clear the permission key list', () => {
      const role = Role.create({ key: 'admin' });
      role.withPermissionKeys(['read:roles']);

      role.withPermissionKeys([]);

      expect(role.permissionKeys).toEqual([]);
    });
  });

  describe('updateDescription()', () => {
    it('updates description and touches updatedAt', () => {
      const role = Role.create({ key: 'admin', description: 'old' });
      const before = role.updatedAt;

      role.updateDescription('new');

      expect(role.description).toBe('new');
      expect(role.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('restore()', () => {
    it('clears deletedAt after softDelete', () => {
      const role = Role.create({ key: 'admin' });
      role.softDelete();

      role.restore();

      expect(role.isDeleted()).toBe(false);
      expect(role.deletedAt).toBeUndefined();
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt', () => {
      const role = Role.create({ key: 'admin' });

      const before = new Date();
      role.softDelete();

      expect(role.isDeleted()).toBe(true);
      expect(role.deletedAt).toBeDefined();
      expect(role.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('is a no-op when already deleted', () => {
      const role = Role.create({ key: 'admin' });
      role.softDelete();
      const firstDeletedAt = role.deletedAt;

      role.softDelete();

      expect(role.deletedAt).toEqual(firstDeletedAt);
    });
  });
});
