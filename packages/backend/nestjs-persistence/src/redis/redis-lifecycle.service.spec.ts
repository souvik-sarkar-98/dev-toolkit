import { RedisLifecycleService } from '@ssdev-toolkit/nestjs-persistence/redis/redis-lifecycle.service';

describe('RedisLifecycleService', () => {
  it('disconnects the KeyvRedis client on application shutdown', async () => {
    const keyvRedis = { disconnect: jest.fn().mockResolvedValue(undefined) };
    const service = new RedisLifecycleService(keyvRedis as any);

    await service.onApplicationShutdown('SIGTERM');

    expect(keyvRedis.disconnect).toHaveBeenCalledTimes(1);
  });

  it('handles missing KeyvRedis gracefully (no-op)', async () => {
    const service = new RedisLifecycleService(undefined);
    await expect(service.onApplicationShutdown('SIGTERM')).resolves.not.toThrow();
  });

  it('does not throw when KeyvRedis disconnect fails', async () => {
    const keyvRedis = { disconnect: jest.fn().mockRejectedValue(new Error('close error')) };
    const service = new RedisLifecycleService(keyvRedis as any);

    await expect(service.onApplicationShutdown('SIGTERM')).resolves.not.toThrow();
  });
});
