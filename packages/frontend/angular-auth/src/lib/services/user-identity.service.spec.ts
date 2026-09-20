import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthUser } from '@ssdev-toolkit/auth-core';
import { snapshotFromCurrentUser } from '@ssdev-toolkit/auth-core';
import { AuthorizationService } from './authorization.service';
import { PlatformAuthService } from './platform-auth.service';
import { UserIdentityService } from './user-identity.service';
import { RbacStateService } from './rbac-state.service';

class TestPlatformAuthService extends PlatformAuthService {
  initialize = vi.fn();
  logout = vi.fn();
  isAuthenticated$ = new BehaviorSubject<boolean>(true);
  user$ = new BehaviorSubject<AuthUser | null>({
    sub: 'auth0|abc',
    email: 'user@example.com',
    email_verified: true,
    name: 'User',
    given_name: 'User',
    family_name: 'Example',
    nickname: 'user',
    picture: '',
  });
  getAccessTokenSilently = vi.fn().mockReturnValue(of('token'));
  loginWith = vi.fn();
}

describe('UserIdentityService', () => {
  let service: UserIdentityService;
  let platformAuth: TestPlatformAuthService;
  let authorization: AuthorizationService;

  beforeEach(() => {
    platformAuth = new TestPlatformAuthService();
    const state = new RbacStateService();
    authorization = new AuthorizationService(
      {
        fetchCurrentUserSnapshot: () =>
          of(snapshotFromCurrentUser({ idpSub: 'auth0|abc', permissions: ['read:projects'] })),
      },
      state,
    );
    service = new UserIdentityService(platformAuth, authorization);
  });

  it('configure initializes platform auth and loads RBAC when logged in', async () => {
    await service.configure();

    expect(platformAuth.initialize).toHaveBeenCalled();
    expect(service.isLoggedIn).toBe(true);
    expect(authorization.hasPermission('read:projects')).toBe(true);
  });

  it('logout clears RBAC and calls platform logout', async () => {
    await service.configure();
    service.logout();

    expect(authorization.snapshot).toBeNull();
    expect(platformAuth.logout).toHaveBeenCalled();
  });

  it('configure survives RBAC load failure without throwing', async () => {
    const state = new RbacStateService();
    const failingAuthorization = new AuthorizationService(
      {
        fetchCurrentUserSnapshot: () => throwError(() => new Error('network')),
      },
      state,
    );
    const failingService = new UserIdentityService(platformAuth, failingAuthorization);

    await expect(failingService.configure()).resolves.toBeUndefined();
    expect(failingService.isLoggedIn).toBe(true);
  });
});
