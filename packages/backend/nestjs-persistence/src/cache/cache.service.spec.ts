import { CacheService } from '@ssdev-toolkit/nestjs-persistence/cache/cache.service';

describe('CacheService', () => {
  function makeService() {
    const store = new Map<string, unknown>();
    const cacheManager = {
      get: jest.fn((key: string) => Promise.resolve(store.get(key))),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
    };

    return {
      service: new CacheService(cacheManager as any),
      cacheManager,
    };
  }

  it('deduplicates concurrent cache misses for the same key', async () => {
    const { service, cacheManager } = makeService();
    const factory = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('value'), 1);
        }),
    );

    const [first, second] = await Promise.all([
      service.getOrSet('same-key', factory),
      service.getOrSet('same-key', factory),
    ]);

    expect(first).toBe('value');
    expect(second).toBe('value');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(cacheManager.set).toHaveBeenCalledWith('same-key', 'value', undefined);
  });
});
