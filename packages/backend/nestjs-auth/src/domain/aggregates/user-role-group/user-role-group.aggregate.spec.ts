import 'reflect-metadata';
import { UserRoleGroup } from './user-role-group.aggregate';
import { UserRoleGroupGrantedEvent } from '../../events/user-role-group-granted.event';
import { UserRoleGroupRevokedEvent } from '../../events/user-role-group-revoked.event';

describe('UserRoleGroup aggregate', () => {
  describe('grant()', () => {
    it('creates an active group membership', () => {
      const membership = UserRoleGroup.grant({
        idpSub: 'user|abc',
        groupId: 'group-id-1',
      });

      expect(membership).toBeInstanceOf(UserRoleGroup);
      expect(membership.idpSub).toBe('user|abc');
      expect(membership.groupId).toBe('group-id-1');
      expect(membership.isActive()).toBe(true);
    });

    it('stores optional fields', () => {
      const membership = UserRoleGroup.grant({
        idpSub: 'user|abc',
        groupId: 'group-id-1',
        ownerId: 'owner-1',
        grantedBy: 'admin|xyz',
        note: 'added to admin group',
      });

      expect(membership.ownerId).toBe('owner-1');
      expect(membership.grantedBy).toBe('admin|xyz');
      expect(membership.note).toBe('added to admin group');
    });

    it('emits UserRoleGroupGrantedEvent', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });

      expect(membership.domainEvents).toHaveLength(1);
      expect(membership.domainEvents[0]).toBeInstanceOf(UserRoleGroupGrantedEvent);
    });

    it('assigns a UUID id', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });

      expect(membership.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('revoke()', () => {
    it('sets revokedAt and makes the membership inactive', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });
      membership.clearEvents();

      const before = new Date();
      membership.revoke('admin|xyz');

      expect(membership.isActive()).toBe(false);
      expect(membership.revokedAt).toBeDefined();
      expect(membership.revokedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(membership.revokedBy).toBe('admin|xyz');
    });

    it('emits UserRoleGroupRevokedEvent', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });
      membership.clearEvents();

      membership.revoke('admin|xyz');

      expect(membership.domainEvents).toHaveLength(1);
      expect(membership.domainEvents[0]).toBeInstanceOf(UserRoleGroupRevokedEvent);
    });
  });

  describe('isActive()', () => {
    it('returns true for a freshly granted membership', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });

      expect(membership.isActive()).toBe(true);
    });

    it('returns false after revoke()', () => {
      const membership = UserRoleGroup.grant({ idpSub: 'user|abc', groupId: 'group-id-1' });
      membership.revoke('someone');

      expect(membership.isActive()).toBe(false);
    });
  });
});
