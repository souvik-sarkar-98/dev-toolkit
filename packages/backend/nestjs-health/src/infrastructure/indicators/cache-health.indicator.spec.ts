import type { CacheService } from '@ssdev-toolkit/nestjs-persistence';
import { HealthOptionsSchema } from '../../health.schema';
import { CacheHealthIndicator } from './cache-health.indicator';

describe('CacheHealthIndicator', () => {
  const cache = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue('1'),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    info: jest.fn().mockResolvedValue('# Memory\r\nused_memory:1048576\r\nused_memory_human:1.00M\r\n'),
  };

  const buildWith = (store: unknown, options: unknown) =>
    new CacheHealthIndicator(
      cache as unknown as CacheService,
      store as never,
      HealthOptionsSchema.parse(options),
    );

  const build = (options: unknown = {}) => buildWith({ redis }, options);
  const buildWithoutClient = (options: unknown = {}) => buildWith(undefined, options);

  beforeEach(() => jest.clearAllMocks());

  it('takes its name and criticality from the configured options', () => {
    const indicator = build();

    expect(indicator.name).toBe('redis');
    expect(indicator.critical).toBe(true);
  });

  it('is healthy when the probe value survives a full round-trip', async () => {
    await expect(build().check()).resolves.toEqual({ healthy: true });

    expect(cache.set).toHaveBeenCalledWith('__health_probe__', '1', 5000);
    expect(cache.get).toHaveBeenCalledWith('__health_probe__');
    expect(cache.del).toHaveBeenCalledWith('__health_probe__');
  });

  it('does not spend a PING while the round-trip succeeds', async () => {
    await build().check();

    expect(redis.ping).not.toHaveBeenCalled();
  });

  it('surfaces the driver error when the connection is what failed', async () => {
    cache.get.mockResolvedValueOnce(undefined);
    redis.ping.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:6379'));

    await expect(build().check()).rejects.toThrow('ECONNREFUSED 127.0.0.1:6379');
  });

  it('reports a refused write when the connection is up but the value is lost', async () => {
    cache.get.mockResolvedValueOnce(undefined);

    const outcome = await build().check();

    expect(redis.ping).toHaveBeenCalled();
    expect(outcome.healthy).toBe(false);
    expect(outcome.message).toContain('did not round-trip');
  });

  it('honours an overridden probe key and ttl', async () => {
    await build({ cache: { probeKey: 'probe:health', probeTtlMs: 100 } }).check();

    expect(cache.set).toHaveBeenCalledWith('probe:health', '1', 100);
  });

  it('leaves memory unread unless a threshold is configured', async () => {
    await build().check();

    expect(redis.info).not.toHaveBeenCalled();
  });

  it('reports used memory alongside the threshold when under it', async () => {
    const outcome = await build({ cache: { memoryThresholdBytes: 2_097_152 } }).check();

    expect(redis.info).toHaveBeenCalledWith('memory');
    expect(outcome).toEqual({
      healthy: true,
      details: { usedMemoryBytes: 1_048_576, memoryThresholdBytes: 2_097_152 },
    });
  });

  it('is unhealthy when used memory exceeds the threshold', async () => {
    const outcome = await build({ cache: { memoryThresholdBytes: 524_288 } }).check();

    expect(outcome.healthy).toBe(false);
    expect(outcome.message).toContain('above the 524288 byte threshold');
    expect(outcome.details).toEqual({
      usedMemoryBytes: 1_048_576,
      memoryThresholdBytes: 524_288,
    });
  });

  it('skips the memory check when INFO has no used_memory line', async () => {
    redis.info.mockResolvedValueOnce('# Memory\r\n');

    await expect(build({ cache: { memoryThresholdBytes: 1 } }).check()).resolves.toEqual({
      healthy: true,
    });
  });

  it('falls back to the round-trip alone on a non-Redis cache store', async () => {
    const indicator = buildWithoutClient({ cache: { memoryThresholdBytes: 1 } });

    await expect(indicator.check()).resolves.toEqual({ healthy: true });
    expect(redis.info).not.toHaveBeenCalled();
  });

  it('reports the generic failure when there is no client to interrogate', async () => {
    cache.get.mockResolvedValueOnce(undefined);

    const outcome = await buildWithoutClient().check();

    expect(outcome.healthy).toBe(false);
    expect(outcome.message).toContain('did not round-trip');
  });
});
