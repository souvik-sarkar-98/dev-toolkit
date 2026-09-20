import { resolveThrottlers } from './resolve-throttlers.util';

describe('resolveThrottlers', () => {
  it('returns package defaults when no config is provided', () => {
    expect(resolveThrottlers()).toEqual([
      { name: 'default', limit: 600, ttl: 60_000 },
      { name: 'open', limit: 10, ttl: 60_000 },
      { name: 'protected', limit: 300, ttl: 60_000 },
      { name: 'strict', limit: 1, ttl: 60_000 },
    ]);
  });

  it('merges module-configurable profile overrides', () => {
    expect(
      resolveThrottlers({
        profiles: {
          default: { limit: 1000 },
          open: { limit: 20, ttlMs: 120_000 },
        },
      }),
    ).toEqual([
      { name: 'default', limit: 1000, ttl: 60_000 },
      { name: 'open', limit: 20, ttl: 120_000 },
      { name: 'protected', limit: 300, ttl: 60_000 },
      { name: 'strict', limit: 1, ttl: 60_000 },
    ]);
  });
});
