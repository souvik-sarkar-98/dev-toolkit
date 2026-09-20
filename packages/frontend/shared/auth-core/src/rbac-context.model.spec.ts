import { describe, expect, it } from 'vitest';
import {
  contextFrom,
  effectivePermissions,
  effectiveRoleGroups,
  effectiveRoles,
  snapshotFromCurrentUser,
} from './rbac-context.model.js';

describe('snapshotFromCurrentUser', () => {
  it('maps API id to userId and defaults missing collections', () => {
    const snapshot = snapshotFromCurrentUser({
      idpSub: 'auth0|abc',
      id: 'u-1',
    });
    expect(snapshot.userId).toBe('u-1');
    expect(snapshot.permissions).toEqual([]);
    expect(snapshot.userRoles).toEqual([]);
    expect(snapshot.roleGroups).toEqual([]);
    expect(snapshot.scopedAccess).toEqual([]);
  });

  it('prefers userId over id', () => {
    const snapshot = snapshotFromCurrentUser({
      idpSub: 'auth0|abc',
      userId: 'profile-1',
      id: 'ignored',
    });
    expect(snapshot.userId).toBe('profile-1');
  });
});

describe('effective access', () => {
  const snapshot = snapshotFromCurrentUser({
    idpSub: 'auth0|abc',
    permissions: ['read:projects'],
    userRoles: ['admin'],
    roleGroups: ['field_team'],
    scopedAccess: [
      {
        entityId: 'proj-A',
        entityType: 'project',
        permissions: ['update:project'],
        userRoles: ['coordinator'],
        roleGroups: ['project_leads'],
      },
    ],
  });

  it('unions global and scoped permissions for a matching entity', () => {
    const ctx = contextFrom('project', 'proj-A');
    expect(effectivePermissions(snapshot, ctx)).toEqual(['read:projects', 'update:project']);
    expect(effectiveRoles(snapshot, ctx)).toEqual(['admin', 'coordinator']);
    expect(effectiveRoleGroups(snapshot, ctx)).toEqual(['field_team', 'project_leads']);
  });

  it('does not expose scoped-only permissions outside context', () => {
    expect(effectivePermissions(snapshot)).toEqual(['read:projects']);
    expect(effectivePermissions(snapshot, contextFrom('project', 'other'))).toEqual(['read:projects']);
  });
});
