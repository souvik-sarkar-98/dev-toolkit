import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { ScopedPermissionsGuard } from './scoped-permissions.guard';
import {
  REQUIRE_PERMISSIONS_IN_SCOPE_KEY,
  RequirePermissionsInScopeMeta,
} from '../decorators/require-permissions-in-scope.decorator';
import { AuthUser } from '../../application/models/auth-user';

const projectScopeMeta: RequirePermissionsInScopeMeta = {
  scope: { from: 'params', entityIdKey: 'projectId', entityTypeValue: 'project' },
  permissions: ['update:project'],
};

function makeReflector(meta: RequirePermissionsInScopeMeta | undefined) {
  return {
    getAllAndOverride: jest.fn().mockImplementation((key: string) => {
      return key === REQUIRE_PERMISSIONS_IN_SCOPE_KEY ? meta : undefined;
    }),
  };
}

function makeContext(user: AuthUser | undefined, params: Record<string, string> = { projectId: 'proj-A' }) {
  const request = { user, params };
  return {
    getHandler: jest.fn(() => ({})),
    getClass: jest.fn(() => ({})),
    switchToHttp: jest.fn(() => ({ getRequest: jest.fn(() => request) })),
  };
}

function jwtUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    type: 'jwt',
    idpSub: 'user|abc',
    permissions: [],
    userRoles: [],
    roleGroups: [],
    ...overrides,
  };
}

describe('ScopedPermissionsGuard', () => {
  it('returns true when no scope metadata is set', () => {
    const guard = new ScopedPermissionsGuard(makeReflector(undefined) as any);

    expect(guard.canActivate(makeContext(jwtUser()) as any)).toBe(true);
  });

  it('allows when the user holds the required permission globally', () => {
    const guard = new ScopedPermissionsGuard(makeReflector(projectScopeMeta) as any);
    const user = jwtUser({ permissions: ['update:project'] });

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('allows when scopedAccess contains the required permission for the request entity', () => {
    const guard = new ScopedPermissionsGuard(makeReflector(projectScopeMeta) as any);
    const user = jwtUser({
      scopedAccess: [
        {
          entityId: 'proj-A',
          entityType: 'project',
          permissions: ['update:project'],
          userRoles: ['coordinator'],
          roleGroups: [],
        },
      ],
    });

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('denies with ForbiddenException when scopedAccess is missing instead of throwing TypeError', () => {
    const guard = new ScopedPermissionsGuard(makeReflector(projectScopeMeta) as any);
    const user = jwtUser();
    delete (user as { scopedAccess?: AuthUser['scopedAccess'] }).scopedAccess;

    expect(() => guard.canActivate(makeContext(user) as any)).toThrow(ForbiddenException);
  });

  it('denies when scopedAccess exists but does not match the request entity', () => {
    const guard = new ScopedPermissionsGuard(makeReflector(projectScopeMeta) as any);
    const user = jwtUser({
      scopedAccess: [
        {
          entityId: 'proj-B',
          entityType: 'project',
          permissions: ['update:project'],
          userRoles: [],
          roleGroups: [],
        },
      ],
    });

    try {
      guard.canActivate(makeContext(user) as any);
      fail('Expected access to be denied');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      const response = (error as ForbiddenException).getResponse();
      expect(JSON.stringify(response)).toContain('Insufficient permissions');
      expect(JSON.stringify(response)).not.toContain('proj-A');
      expect(JSON.stringify(response)).not.toContain('update:project');
    }
  });
});
