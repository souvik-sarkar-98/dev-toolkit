import { describe, expect, it } from 'vitest';
import { inspectWaitUntilLoaded, RbacSession } from './rbac-session.js';
import {
  decideAuthGuard,
  decideNoAuthGuard,
  decidePermissionGuard,
  sanitizeInternalRedirectUrl,
} from './auth-decisions.js';

describe('RbacSession waitUntilLoaded', () => {
  it('resolves when already loaded', async () => {
    const session = new RbacSession<{ id: string }>();
    session.setSnapshot({ id: '1' });
    await expect(session.waitUntilLoaded()).resolves.toEqual({ id: '1' });
  });

  it('rejects failed and cleared states', async () => {
    const failed = new RbacSession();
    failed.markFailed();
    await expect(failed.waitUntilLoaded()).rejects.toMatchObject({ reason: 'failed' });

    const cleared = new RbacSession();
    cleared.clear();
    await expect(cleared.waitUntilLoaded()).rejects.toMatchObject({ reason: 'cleared' });
  });

  it('inspectWaitUntilLoaded waits while loading', () => {
    expect(inspectWaitUntilLoaded('loading', null)).toEqual({ status: 'wait' });
  });
});

describe('auth guard decisions', () => {
  it('sends unauthenticated users to login with redirect', () => {
    expect(decideAuthGuard(false, '/app/list?chip=a')).toEqual({
      action: 'login',
      redirectTo: '/app/list?chip=a',
    });
    expect(decideAuthGuard(true, '/app')).toEqual({ action: 'allow' });
  });

  it('redirects authenticated users off public routes', () => {
    expect(decideNoAuthGuard(true, '/home')).toEqual({ action: 'redirect', url: '/home' });
  });

  it('maps missing RBAC to login and missing permission to unauthorized', () => {
    expect(
      decidePermissionGuard({
        rbacAvailable: false,
        allowed: false,
        loginUrl: '/login',
        postLoginUrl: '/home',
      }),
    ).toEqual({ action: 'login' });
    expect(
      decidePermissionGuard({
        rbacAvailable: true,
        allowed: false,
        loginUrl: '/login',
        postLoginUrl: '/home',
      }),
    ).toEqual({ action: 'unauthorized', url: '/home' });
  });
});

describe('sanitizeInternalRedirectUrl', () => {
  it('rejects protocol-relative urls without using window', () => {
    expect(sanitizeInternalRedirectUrl('//evil.example', '/home')).toBe('/home');
    expect(sanitizeInternalRedirectUrl('/ok?x=1', '/home')).toBe('/ok?x=1');
  });
});
