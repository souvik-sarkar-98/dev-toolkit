import type { AddressInfo } from 'net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthModule, type HealthModuleRootOptions } from './health.module';
import { ServiceStatus } from './domain/enums/service-status.enum';
import { HealthStatus } from './domain/enums/health-status.enum';
import type { MetricsResult, ReadinessResult } from './application/dtos/health.dto';

/**
 * The 503 on failed readiness and the conditional metrics route depend on how
 * Nest assembles the module, so they are worth proving over real HTTP.
 */
describe('HealthModule (HTTP)', () => {
  const apps: INestApplication[] = [];

  const boot = async (options: HealthModuleRootOptions) => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        // The built-in indicators need a database and cache the harness has no
        // reason to provide — readiness is driven by inline checks instead.
        HealthModule.forRoot({ databaseIndicator: false, cacheIndicator: false, ...options }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    apps.push(app);
    await app.init();
    await app.listen(0, '127.0.0.1');

    const { port } = app.getHttpServer().address() as AddressInfo;
    return async <T>(path: string): Promise<{ status: number; body: T }> => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      const body = response.status === 404 ? undefined : await response.json();
      return { status: response.status, body: body as T };
    };
  };

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  it('serves liveness at /health', async () => {
    const get = await boot({ serviceName: 'orders-api' });

    const { status, body } = await get('/health');

    expect(status).toBe(200);
    expect(body).toMatchObject({ status: ServiceStatus.OK, service: 'orders-api' });
  });

  it('serves runtime metrics at /metrics', async () => {
    const get = await boot({});

    const { status, body } = await get<MetricsResult>('/metrics');

    expect(status).toBe(200);
    expect(body.pid).toBe(process.pid);
    expect(body.memory.process.heapUsedMb).toBeGreaterThan(0);
  });

  it('answers 200 at /ready while every critical check passes', async () => {
    const get = await boot({ checks: [{ name: 'search', check: () => true }] });

    const { status, body } = await get('/ready');

    expect(status).toBe(200);
    expect(body).toMatchObject({
      status: ServiceStatus.OK,
      ready: true,
      degraded: false,
      checks: { search: HealthStatus.UP },
    });
  });

  it('answers 503 at /ready when a critical check fails', async () => {
    const get = await boot({ checks: [{ name: 'search', check: () => false }] });

    const { status, body } = await get('/ready');

    expect(status).toBe(503);
    expect(body).toMatchObject({
      status: ServiceStatus.ERROR,
      ready: false,
      checks: { search: HealthStatus.DOWN },
    });
  });

  it('stays 200 when only a non-critical check fails', async () => {
    const get = await boot({
      checks: [{ name: 'search', critical: false, check: () => false }],
    });

    const { status, body } = await get<ReadinessResult>('/ready');

    expect(status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.degraded).toBe(true);
  });

  it('does not expose metrics when the endpoint is disabled', async () => {
    const get = await boot({ metricsEndpoint: false });

    expect((await get('/metrics')).status).toBe(404);
    expect((await get('/health')).status).toBe(200);
  });
});
