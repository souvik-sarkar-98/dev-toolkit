import type { BasePrismaService } from '@ssdev-toolkit/nestjs-persistence';
import { HealthOptionsSchema } from '../../health.schema';
import { DatabaseHealthIndicator } from './database-health.indicator';

describe('DatabaseHealthIndicator', () => {
  const prisma = { healthCheck: jest.fn().mockResolvedValue(true) };
  const indicator = new DatabaseHealthIndicator(
    prisma as unknown as BasePrismaService,
    HealthOptionsSchema.parse({}),
  );

  beforeEach(() => jest.clearAllMocks());

  it('takes its name and criticality from the configured options', () => {
    expect(indicator.name).toBe('database');
    expect(indicator.critical).toBe(true);
  });

  it('is healthy when the probe query succeeds', async () => {
    await expect(indicator.check()).resolves.toEqual({ healthy: true });
    expect(prisma.healthCheck).toHaveBeenCalled();
  });

  it('propagates the driver error so the runner can record it', async () => {
    prisma.healthCheck.mockRejectedValueOnce(new Error('connection refused'));

    await expect(indicator.check()).rejects.toThrow('connection refused');
  });

  it('can be registered as non-critical', () => {
    const optional = new DatabaseHealthIndicator(
      prisma as unknown as BasePrismaService,
      HealthOptionsSchema.parse({ database: { name: 'reporting-db', critical: false } }),
    );

    expect(optional.name).toBe('reporting-db');
    expect(optional.critical).toBe(false);
  });
});
