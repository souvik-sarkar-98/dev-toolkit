import { Cache as NestCache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";

let activeCacheService: CacheService | undefined;
const inFlightCacheMisses = new Map<string, Promise<unknown>>();

export function getActiveCacheService(): CacheService | undefined {
  return activeCacheService;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: NestCache) {
    activeCacheService = this;
  }

  // A Redis outage must NOT take down request handling. Reads degrade to a
  // cache miss, writes/deletes become best-effort no-ops, and the caller's
  // factory still runs — the cache is an optimisation, not a dependency.
  async get<T>(key: string): Promise<T | undefined | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (err) {
      this.logger.warn(
        `Cache get failed for "${key}" (degrading to miss): ${err instanceof Error ? err.message : String(err)
        }`,
      );
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (err) {
      this.logger.warn(
        `Cache set failed for "${key}" (ignored): ${err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (err) {
      this.logger.warn(
        `Cache del failed for "${key}" (ignored): ${err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    options?: { cacheNull?: boolean },
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const existingMiss = inFlightCacheMisses.get(key);
    if (existingMiss) {
      return (await existingMiss) as T;
    }

    const pending = (async () => {
      const value = await factory();
      if (value !== null || options?.cacheNull === true) {
        await this.set(key, value, ttl);
      }
      return value;
    })();

    inFlightCacheMisses.set(key, pending);
    try {
      return await pending;
    } finally {
      if (inFlightCacheMisses.get(key) === pending) {
        inFlightCacheMisses.delete(key);
      }
    }
  }
}
