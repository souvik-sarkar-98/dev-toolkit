import 'reflect-metadata';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthUser } from '../../application/models/auth-user';

function makeReflector(requiredPermissions: string[] | undefined) {
  return {
    getAllAndOverride: jest.fn().mockImplementation((key: symbol | string) => {
      return key === REQUIRE_PERMISSIONS_KEY ? requiredPermissions : undefined;
    }),
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

describe('PermissionsGuard', () => {
  it('returns true when no permissions metadata is set', () => {
    const reflector = makeReflector(undefined);
    const guard = new PermissionsGuard(reflector as any);
    const user = jwtUser();

    const result = guard.canActivate(makeContext(user) as any);

    expect(result).toBe(true);
  });

  it('returns true when the required list is empty', () => {
    const reflector = makeReflector([]);
    const guard = new PermissionsGuard(reflector as any);
    const user = jwtUser();

    const result = guard.canActivate(makeContext(user) as any);

    expect(result).toBe(true);
  });

  it('returns true when the user has at least one required permission', () => {
    const reflector = makeReflector(['read:roles', 'delete:api_keys']);
    const guard = new PermissionsGuard(reflector as any);
    const user = jwtUser({ permissions: ['read:roles'] });

    const result = guard.canActivate(makeContext(user) as any);

    expect(result).toBe(true);
  });

  it('returns false when the user has none of the required permissions', () => {
    const reflector = makeReflector(['delete:api_keys']);
    const guard = new PermissionsGuard(reflector as any);
    const user = jwtUser({ permissions: ['read:roles'] });

    const result = guard.canActivate(makeContext(user) as any);

    expect(result).toBe(false);
  });

  it('returns false when the user has no permissions array', () => {
    const reflector = makeReflector(['read:roles']);
    const guard = new PermissionsGuard(reflector as any);
    const user = { type: 'jwt', idpSub: 'user|abc' } as AuthUser;

    const result = guard.canActivate(makeContext(user) as any);

    expect(result).toBe(false);
  });

  it('returns false when user is undefined', () => {
    const reflector = makeReflector(['read:roles']);
    const guard = new PermissionsGuard(reflector as any);

    const result = guard.canActivate(makeContext(undefined) as any);

    expect(result).toBe(false);
  });

  it('passes the correct metadata keys to reflector.getAllAndOverride', () => {
    const reflector = makeReflector(['read:roles']);
    const guard = new PermissionsGuard(reflector as any);
    const user = jwtUser({ permissions: ['read:roles'] });

    guard.canActivate(makeContext(user) as any);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_PERMISSIONS_KEY,
      expect.any(Array),
    );
  });
});
