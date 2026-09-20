import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AUTH_CONFIG, authGuard, noAuthGuard, USER_IDENTITY } from '../../public-api';

describe('authGuard', () => {
  let router: { navigate: ReturnType<typeof vi.fn> };
  let isUserLoggedIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    router = { navigate: vi.fn() };
    isUserLoggedIn = vi.fn().mockResolvedValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: USER_IDENTITY, useValue: { isUserLoggedIn } },
        {
          provide: AUTH_CONFIG,
          useValue: { loginUrl: '/login', postLoginUrl: '/secured/dashboard' },
        },
      ],
    });
  });

  it('redirects unauthenticated users using router state url', async () => {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/secured/finance/accounts?chip=active' } as RouterStateSnapshot;

    const allowed = await TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(allowed).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      state: { redirect_to: '/secured/finance/accounts?chip=active' },
    });
  });

  it('allows authenticated users', async () => {
    isUserLoggedIn.mockResolvedValue(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/secured/dashboard' } as RouterStateSnapshot;

    const allowed = await TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(allowed).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('noAuthGuard', () => {
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let isUserLoggedIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    router = { navigateByUrl: vi.fn() };
    isUserLoggedIn = vi.fn().mockResolvedValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: USER_IDENTITY, useValue: { isUserLoggedIn } },
        {
          provide: AUTH_CONFIG,
          useValue: { loginUrl: '/login', postLoginUrl: '/secured/dashboard' },
        },
      ],
    });
  });

  it('redirects authenticated users away from public routes', async () => {
    isUserLoggedIn.mockResolvedValue(true);

    const allowed = await TestBed.runInInjectionContext(() => noAuthGuard());

    expect(allowed).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/secured/dashboard');
  });
});
