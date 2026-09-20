import { Inject, Injectable, Optional } from '@nestjs/common';
import { CacheService, KEYV_REDIS_CLIENT } from '@ssdev-toolkit/nestjs-persistence';
import type {
  HealthIndicatorOutcome,
  IHealthIndicator,
} from '../../domain/ports/health-indicator.port';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../health.schema';

const PROBE_VALUE = '1';
const USED_MEMORY_PATTERN = /^used_memory:(\d+)/m;

/** The commands the probe needs. `@keyv/redis` exposes its ioredis client as `.redis`. */
interface RedisCommandClient {
  ping(): Promise<unknown>;
  info(section: string): Promise<string>;
}

interface KeyvRedisStore {
  redis?: RedisCommandClient;
}

/**
 * Built-in cache indicator.
 *
 * The pass/fail signal is a write, read, and delete of a throwaway key rather
 * than a `PING`: `CacheService` swallows connection errors by design so a Redis
 * outage cannot break request handling, and a round-trip is the only thing that
 * also catches a server that answers `PING` while rejecting writes — one at
 * `maxmemory` with `noeviction`, or a read-only replica.
 *
 * `PING` is still issued, but only after a failed round-trip, to recover the
 * driver's real error message for the report.
 */
@Injectable()
export class CacheHealthIndicator implements IHealthIndicator {
  constructor(
    private readonly cache: CacheService,
    @Optional()
    @Inject(KEYV_REDIS_CLIENT)
    private readonly store: KeyvRedisStore | undefined,
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  get name(): string {
    return this.options.cache.name;
  }

  get critical(): boolean {
    return this.options.cache.critical;
  }

  async check(): Promise<HealthIndicatorOutcome> {
    if (!(await this.roundTrips())) {
      // Throws the driver error when the connection is the problem; the runner
      // records its message. Returning normally means the connection is fine
      // and the write itself was refused.
      await this.client?.ping();
      return {
        healthy: false,
        message:
          'Cache connection is up but the probe value did not round-trip — the server may be at maxmemory, read-only, or evicting aggressively',
      };
    }

    return this.evaluateMemory();
  }

  private async roundTrips(): Promise<boolean> {
    const { probeKey, probeTtlMs } = this.options.cache;

    await this.cache.set(probeKey, PROBE_VALUE, probeTtlMs);
    const value = await this.cache.get<string>(probeKey);
    await this.cache.del(probeKey);

    return value === PROBE_VALUE;
  }

  private async evaluateMemory(): Promise<HealthIndicatorOutcome> {
    const threshold = this.options.cache.memoryThresholdBytes;
    if (!threshold) return { healthy: true };

    const usedMemoryBytes = await this.readUsedMemory();
    if (usedMemoryBytes === undefined) return { healthy: true };

    const details = { usedMemoryBytes, memoryThresholdBytes: threshold };
    return usedMemoryBytes > threshold
      ? {
        healthy: false,
        message: `Cache is using ${usedMemoryBytes} bytes, above the ${threshold} byte threshold`,
        details,
      }
      : { healthy: true, details };
  }

  private async readUsedMemory(): Promise<number | undefined> {
    if (!this.client) return undefined;

    const match = USED_MEMORY_PATTERN.exec(await this.client.info('memory'));
    return match ? Number(match[1]) : undefined;
  }

  /** Undefined when the host runs a non-Redis cache store, or no cache at all. */
  private get client(): RedisCommandClient | undefined {
    return this.store?.redis;
  }
}
