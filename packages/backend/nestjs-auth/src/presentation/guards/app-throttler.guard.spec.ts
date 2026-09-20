import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLER_LIMIT } from '../constants/throttler.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppThrottlerGuard } from './app-throttler.guard';
import { AuthModuleOptions } from '../../auth-options';

const baseAuthOptions: AuthModuleOptions = {
  jwt: { jwksUri: 'https://example.com', issuer: 'iss', audience: 'aud' },
};

function makeGuard(
  authOptions: AuthModuleOptions = baseAuthOptions,
  reflector = new Reflector(),
) {
  return new AppThrottlerGuard(
    { throttlers: [{ name: 'default', ttl: 60_000, limit: 600 }] },
    {} as never,
    reflector,
    authOptions,
  );
}

function makeContext(path = '/projects'): ExecutionContext {
  const handler = jest.fn();
  const classRef = jest.fn();
  return {
    getHandler: () => handler,
    getClass: () => classRef,
    switchToHttp: () => ({
      getRequest: () => ({ url: path, ip: '127.0.0.1' }),
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(meta: Record<string, unknown>) {
  return {
    getAllAndOverride: jest.fn((key: string) => meta[key] ?? undefined),
  } as unknown as Reflector;
}

describe('AppThrottlerGuard', () => {
  it('always applies the default profile', () => {
    const guard = makeGuard();
    expect(guard['shouldApplyProfile'](makeContext(), 'default')).toBe(true);
  });

  it('applies open only to public routes', () => {
    const publicGuard = makeGuard(baseAuthOptions, makeReflector({ [IS_PUBLIC_KEY]: true }));
    const protectedGuard = makeGuard(baseAuthOptions, makeReflector({ [IS_PUBLIC_KEY]: false }));

    expect(publicGuard['shouldApplyProfile'](makeContext(), 'open')).toBe(true);
    expect(protectedGuard['shouldApplyProfile'](makeContext(), 'open')).toBe(false);
  });

  it('applies protected only to non-public routes', () => {
    const publicGuard = makeGuard(baseAuthOptions, makeReflector({ [IS_PUBLIC_KEY]: true }));
    const protectedGuard = makeGuard(baseAuthOptions, makeReflector({ [IS_PUBLIC_KEY]: false }));

    expect(protectedGuard['shouldApplyProfile'](makeContext(), 'protected')).toBe(true);
    expect(publicGuard['shouldApplyProfile'](makeContext(), 'protected')).toBe(false);
  });

  it('applies strict only when decorator metadata is present', () => {
    const withStrict = makeGuard(
      baseAuthOptions,
      makeReflector({ [`${THROTTLER_LIMIT}strict`]: 5 }),
    );
    const withoutStrict = makeGuard(baseAuthOptions, makeReflector({}));

    expect(withStrict['shouldApplyProfile'](makeContext(), 'strict')).toBe(true);
    expect(withoutStrict['shouldApplyProfile'](makeContext(), 'strict')).toBe(false);
  });

  it('skips all routes when throttling is disabled', async () => {
    const guard = makeGuard({
      ...baseAuthOptions,
      throttler: { enabled: false },
    });

    await expect(guard['shouldSkip'](makeContext())).resolves.toBe(true);
  });

  it('skips configured path prefixes', async () => {
    const guard = makeGuard({
      ...baseAuthOptions,
      throttler: { skipPathPrefixes: ['/health'] },
    });

    await expect(guard['shouldSkip'](makeContext('/health'))).resolves.toBe(true);
    await expect(guard['shouldSkip'](makeContext('/health/ready'))).resolves.toBe(true);
  });
});
