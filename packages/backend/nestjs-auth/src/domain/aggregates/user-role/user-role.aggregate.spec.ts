import 'reflect-metadata';
import { UserRole } from './user-role.aggregate';
import { UserRoleGrantedEvent } from '../../events/user-role-granted.event';
import { UserRoleRevokedEvent } from '../../events/user-role-revoked.event';

describe('UserRole aggregate', () => {
  describe('grant()', () => {
    it('creates an active UserRole', () => {
      const userRole = UserRole.grant({
        idpSub: 'user|abc',
        roleId: 'role-id-1',
      });

      expect(userRole).toBeInstanceOf(UserRole);
      expect(userRole.idpSub).toBe('user|abc');
      expect(userRole.roleId).toBe('role-id-1');
      expect(userRole.isActive()).toBe(true);
    });

    it('stores optional fields', () => {
      const userRole = UserRole.grant({
        idpSub: 'user|abc',
        roleId: 'role-id-1',
        ownerId: 'owner-1',
        grantedBy: 'admin|xyz',
        note: 'granted for project',
      });

      expect(userRole.ownerId).toBe('owner-1');
      expect(userRole.grantedBy).toBe('admin|xyz');
      expect(userRole.note).toBe('granted for project');
    });

    it('emits UserRoleGrantedEvent', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });

      expect(userRole.domainEvents).toHaveLength(1);
      expect(userRole.domainEvents[0]).toBeInstanceOf(UserRoleGrantedEvent);
    });

    it('assigns a UUID id', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });

      expect(userRole.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('revoke()', () => {
    it('sets revokedAt and makes the role inactive', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });
      userRole.clearEvents();

      const before = new Date();
      userRole.revoke('admin|xyz');

      expect(userRole.isActive()).toBe(false);
      expect(userRole.revokedAt).toBeDefined();
      expect(userRole.revokedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(userRole.revokedBy).toBe('admin|xyz');
    });

    it('emits UserRoleRevokedEvent', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });
      userRole.clearEvents();

      userRole.revoke('admin|xyz');

      expect(userRole.domainEvents).toHaveLength(1);
      expect(userRole.domainEvents[0]).toBeInstanceOf(UserRoleRevokedEvent);
    });
  });

  describe('isActive()', () => {
    it('returns true for a freshly granted role', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });

      expect(userRole.isActive()).toBe(true);
    });

    it('returns false after revoke()', () => {
      const userRole = UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });
      userRole.revoke('someone');

      expect(userRole.isActive()).toBe(false);
    });
  });
});
