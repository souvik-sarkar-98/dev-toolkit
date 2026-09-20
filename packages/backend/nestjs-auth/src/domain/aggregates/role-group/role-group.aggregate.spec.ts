import 'reflect-metadata';
import { RoleGroup } from './role-group.aggregate';

describe('RoleGroup aggregate', () => {
  describe('create()', () => {
    it('creates a RoleGroup with the given key and description', () => {
      const group = RoleGroup.create({ key: 'super-admins', description: 'Super admin group' });

      expect(group).toBeInstanceOf(RoleGroup);
      expect(group.key).toBe('super-admins');
      expect(group.description).toBe('Super admin group');
    });

    it('starts with empty roleKeys', () => {
      const group = RoleGroup.create({ key: 'super-admins' });

      expect(group.roleKeys).toEqual([]);
    });

    it('is not deleted on creation', () => {
      const group = RoleGroup.create({ key: 'super-admins' });

      expect(group.isDeleted()).toBe(false);
      expect(group.deletedAt).toBeUndefined();
    });

    it('assigns a UUID id', () => {
      const group = RoleGroup.create({ key: 'super-admins' });

      expect(group.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('withRoleKeys()', () => {
    it('replaces the role key list', () => {
      const group = RoleGroup.create({ key: 'super-admins' });

      group.withRoleKeys(['admin', 'editor']);

      expect(group.roleKeys).toEqual(['admin', 'editor']);
    });

    it('can clear the role key list', () => {
      const group = RoleGroup.create({ key: 'super-admins' });
      group.withRoleKeys(['admin']);

      group.withRoleKeys([]);

      expect(group.roleKeys).toEqual([]);
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt', () => {
      const group = RoleGroup.create({ key: 'super-admins' });

      const before = new Date();
      group.softDelete();

      expect(group.isDeleted()).toBe(true);
      expect(group.deletedAt).toBeDefined();
      expect(group.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('is a no-op when already deleted', () => {
      const group = RoleGroup.create({ key: 'super-admins' });
      group.softDelete();
      const firstDeletedAt = group.deletedAt;

      group.softDelete();

      expect(group.deletedAt).toEqual(firstDeletedAt);
    });
  });
});
