import 'reflect-metadata';
import { Permission } from './permission.aggregate';

describe('Permission aggregate', () => {
  describe('create()', () => {
    it('creates a Permission with the given key and description', () => {
      const permission = Permission.create({ key: 'read:roles', description: 'Read roles' });

      expect(permission).toBeInstanceOf(Permission);
      expect(permission.key).toBe('read:roles');
      expect(permission.description).toBe('Read roles');
    });

    it('is not deleted on creation', () => {
      const permission = Permission.create({ key: 'read:roles' });

      expect(permission.isDeleted()).toBe(false);
      expect(permission.deletedAt).toBeUndefined();
    });

    it('assigns a UUID id', () => {
      const permission = Permission.create({ key: 'read:roles' });

      expect(permission.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('allows undefined description', () => {
      const permission = Permission.create({ key: 'read:roles' });

      expect(permission.description).toBeUndefined();
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt and marks the permission as deleted', () => {
      const permission = Permission.create({ key: 'read:roles' });

      const before = new Date();
      permission.softDelete();

      expect(permission.isDeleted()).toBe(true);
      expect(permission.deletedAt).toBeDefined();
      expect(permission.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('is a no-op when already deleted', () => {
      const permission = Permission.create({ key: 'read:roles' });
      permission.softDelete();
      const firstDeletedAt = permission.deletedAt;

      permission.softDelete();

      expect(permission.deletedAt).toEqual(firstDeletedAt);
    });
  });

  describe('isDeleted()', () => {
    it('returns false for a freshly created permission', () => {
      const permission = Permission.create({ key: 'read:roles' });

      expect(permission.isDeleted()).toBe(false);
    });

    it('returns true after softDelete()', () => {
      const permission = Permission.create({ key: 'read:roles' });
      permission.softDelete();

      expect(permission.isDeleted()).toBe(true);
    });
  });
});
