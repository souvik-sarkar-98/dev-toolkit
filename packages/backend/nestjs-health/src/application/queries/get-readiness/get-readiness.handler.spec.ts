import { HealthStatus } from '../../../domain/enums/health-status.enum';
import { ServiceStatus } from '../../../domain/enums/service-status.enum';
import { HealthCheckResult } from '../../../domain/value-objects/health-check-result.vo';
import { HealthOptionsSchema, type HealthModuleOptions } from '../../../health.schema';
import type { HealthCheckRunner } from '../../services/health-check-runner.service';
import { GetReadinessHandler } from './get-readiness.handler';

const options = (overrides: Partial<HealthModuleOptions> = {}): HealthModuleOptions => ({
  ...HealthOptionsSchema.parse({}),
  ...overrides,
});

const runnerReturning = (checks: HealthCheckResult[]) =>
  ({ runAll: jest.fn().mockResolvedValue(checks) }) as unknown as HealthCheckRunner;

describe('GetReadinessHandler', () => {
  it('reports ready with a status map of every check', async () => {
    const handler = new GetReadinessHandler(
      runnerReturning([
        HealthCheckResult.up({ name: 'database', critical: true, durationMs: 3 }),
        HealthCheckResult.up({ name: 'redis', critical: true, durationMs: 1 }),
      ]),
      options(),
    );

    const result = await handler.execute();

    expect(result.ready).toBe(true);
    expect(result.status).toBe(ServiceStatus.OK);
    expect(result.degraded).toBe(false);
    expect(result.checks).toEqual({ database: HealthStatus.UP, redis: HealthStatus.UP });
    expect(result.timestamp).toBeDefined();
  });

  it('reports not ready when a critical check is down', async () => {
    const handler = new GetReadinessHandler(
      runnerReturning([
        HealthCheckResult.down({ name: 'database', critical: true, durationMs: 3 }),
        HealthCheckResult.up({ name: 'redis', critical: true, durationMs: 1 }),
      ]),
      options(),
    );

    const result = await handler.execute();

    expect(result.ready).toBe(false);
    expect(result.status).toBe(ServiceStatus.ERROR);
    expect(result.checks.database).toBe(HealthStatus.DOWN);
  });

  it('omits per-check details unless they are explicitly enabled', async () => {
    const checks = [
      HealthCheckResult.down({
        name: 'database',
        critical: true,
        durationMs: 3,
        message: 'password authentication failed for user "app"',
      }),
    ];

    const hidden = await new GetReadinessHandler(
      runnerReturning(checks),
      options(),
    ).execute();
    const exposed = await new GetReadinessHandler(
      runnerReturning(checks),
      options({ exposeCheckDetails: true }),
    ).execute();

    expect(hidden.details).toBeUndefined();
    expect(exposed.details).toEqual([
      {
        name: 'database',
        status: HealthStatus.DOWN,
        critical: true,
        durationMs: 3,
        message: 'password authentication failed for user "app"',
      },
    ]);
  });

  it('includes the configured service identity', async () => {
    const handler = new GetReadinessHandler(
      runnerReturning([]),
      options({ serviceName: 'orders-api', version: '1.4.2' }),
    );

    const result = await handler.execute();

    expect(result.service).toBe('orders-api');
    expect(result.version).toBe('1.4.2');
  });
});
