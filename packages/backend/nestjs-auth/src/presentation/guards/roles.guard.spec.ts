import 'reflect-metadata';
import { RolesGuard } from './roles.guard';
import { REQUIRE_ROLES_KEY } from '../decorators/require-roles.decorator';
import { AuthUser } from '../../application/models/auth-user';

function makeReflector(requiredRoles: string[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
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

describe('RolesGuard', () => {
  it('returns true when no roles metadata is set', () => {
    const guard = new RolesGuard(makeReflector(undefined) as any);
    const user = jwtUser();

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns true when the required list is empty', () => {
    const guard = new RolesGuard(makeReflector([]) as any);
    const user = jwtUser();

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns false when user is undefined', () => {
    const guard = new RolesGuard(makeReflector(['admin']) as any);

    expect(guard.canActivate(makeContext(undefined) as any)).toBe(false);
  });

  it('returns true when user.userRoles contains a required role', () => {
    const guard = new RolesGuard(makeReflector(['admin']) as any);
    const user = jwtUser({ userRoles: ['admin'] });

    expect(guard.canActivate(makeContext(user) as any)).toBe(true);
  });

  it('returns false when user.userRoles does not contain the required role', () => {
    const guard = new RolesGuard(makeReflector(['admin']) as any);
    const user = jwtUser({
      userRoles: ['viewer'],
      roleGroups: ['admin'],
    });

    expect(guard.canActivate(makeContext(user) as any)).toBe(false);
  });

  it('returns false when user.userRoles is empty', () => {
    const guard = new RolesGuard(makeReflector(['admin']) as any);
    const user = jwtUser({ userRoles: [] });

    expect(guard.canActivate(makeContext(user) as any)).toBe(false);
  });

  it('passes the correct metadata key to reflector.getAllAndOverride', () => {
    const reflector = makeReflector(['admin']);
    const guard = new RolesGuard(reflector as any);
    const user = jwtUser({ userRoles: ['admin'] });

    guard.canActivate(makeContext(user) as any);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_ROLES_KEY,
      expect.any(Array),
    );
  });
});
