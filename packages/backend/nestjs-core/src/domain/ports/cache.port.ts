export const ICACHE_PORT = Symbol('ICachePort');

export interface CacheSetOptions {
  ttlMs?: number;
}

/**
 * Minimal cache abstraction so auth/json-store do not depend on persistence package.
 * Host binds to CacheService from DatabaseModule.
 */
export interface ICachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  del(key: string): Promise<void>;
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
    options?: { cacheNull?: boolean },
  ): Promise<T>;
}
