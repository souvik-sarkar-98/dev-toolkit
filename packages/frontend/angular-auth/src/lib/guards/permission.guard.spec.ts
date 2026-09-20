import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { snapshotFromCurrentUser } from '@ssdev-toolkit/auth-core';
import { AUTH_CONFIG, AuthorizationService, permissionGuard } from '../../public-api';
import { RbacStateService } from '../services/rbac-state.service';
import { RBAC_DATA_SOURCE } from '../tokens/rbac-data-source.token';

describe('permissionGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };
  let authorization: AuthorizationService;

  function configureModule(
    fetchCurrentUserSnapshot: () => ReturnType<typeof of> = () =>
      of(
        snapshotFromCurrentUser({
          idpSub: 'auth0|abc',
          permissions: ['read:projects'],
        }),
      ),
  ): void {
    router = { navigate: vi.fn(), navigateByUrl: vi.fn() };
    const state = new RbacStateService();
    authorization = new AuthorizationService({ fetchCurrentUserSnapshot }, state);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthorizationService, useValue: authorization },
        { provide: Router, useValue: router },
        {
          provide: AUTH_CONFIG,
          useValue: { loginUrl: '/login', postLoginUrl: '/secured/dashboard' },
        },
        { provide: RBAC_DATA_SOURCE, useValue: { fetchCurrentUserSnapshot } },
      ],
    });
  }

  beforeEach(() => {
    configureModule();
  });

  it('allows access when permission is present', async () => {
    await authorization.load();
    const guard = permissionGuard('read:projects');

    const allowed = await TestBed.runInInjectionContext(() => guard());

    expect(allowed).toBe(true);
  });

  it('redirects to postLoginUrl when permission is missing', async () => {
    await authorization.load();
    const guard = permissionGuard('delete:projects');

    const allowed = await TestBed.runInInjectionContext(() => guard());

    expect(allowed).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/secured/dashboard');
  });

  it('redirects to login when RBAC load failed', async () => {
    configureModule(() => throwError(() => new Error('network')));
    await expect(authorization.load()).rejects.toThrow('network');

    const guard = permissionGuard('read:projects');
    const allowed = await TestBed.runInInjectionContext(() => guard());

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to login when RBAC was cleared', async () => {
    await authorization.load();
    authorization.clear();

    const guard = permissionGuard('read:projects');
    const allowed = await TestBed.runInInjectionContext(() => guard());

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
