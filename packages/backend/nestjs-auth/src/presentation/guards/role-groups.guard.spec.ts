import 'reflect-metadata';
import { RoleGroupsGuard } from './role-groups.guard';
import { REQUIRE_ROLE_GROUPS_KEY } from '../decorators/require-role-groups.decorator';
import { AuthUser } from '../../application/models/auth-user';

function makeReflector(requiredGroups: string[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredGroups),
  };
}

function makeContext(user: AuthUser | undefined) {
  const request = { user };
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

describe('RoleGroupsGuard', () => {
  it('returns true when no role-groups metadata is set', () => {
    const guard = new RoleGroupsGuard(makeReflector(undefined) as any);
    const user = jwtUser();

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns true when the required list is empty', () => {
    const guard = new RoleGroupsGuard(makeReflector([]) as any);
    const user = jwtUser();

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns true when the user belongs to at least one required group', () => {
    const guard = new RoleGroupsGuard(makeReflector(['super-admins', 'editors']) as any);
    const user = jwtUser({ roleGroups: ['super-admins'] });

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns false when the user belongs to none of the required groups', () => {
    const guard = new RoleGroupsGuard(makeReflector(['super-admins']) as any);
    const user = jwtUser({ roleGroups: ['editors'] });

    expect(guard.canActivate(makeContext(user) as any)).toBe(false);
  });

  it('returns false when user has no roleGroups array', () => {
    const guard = new RoleGroupsGuard(makeReflector(['super-admins']) as any);
    const user = { type: 'jwt', idpSub: 'user|abc' } as AuthUser;

    expect(guard.canActivate(makeContext(user) as any)).toBe(false);
  });

  it('returns false when user is undefined', () => {
    const guard = new RoleGroupsGuard(makeReflector(['super-admins']) as any);

    expect(guard.canActivate(makeContext(undefined) as any)).toBe(false);
  });

  it('passes the correct metadata key to reflector.getAllAndOverride', () => {
    const reflector = makeReflector(['super-admins']);
    const guard = new RoleGroupsGuard(reflector as any);
    const user = jwtUser({ roleGroups: ['super-admins'] });

    guard.canActivate(makeContext(user) as any);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_ROLE_GROUPS_KEY,
      expect.any(Array),
    );
  });
});
