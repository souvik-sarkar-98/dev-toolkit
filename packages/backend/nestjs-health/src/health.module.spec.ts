import { IGNORE_CAPTCHA, IS_PUBLIC_KEY } from '@ssdev-toolkit/nestjs-auth';
import { HealthFacade } from './application/services/health.facade';
import { HealthModule } from './health.module';
import { HEALTH_OPTIONS } from './health.schema';
import { CacheHealthIndicator } from './infrastructure/indicators/cache-health.indicator';
import { DatabaseHealthIndicator } from './infrastructure/indicators/database-health.indicator';
import { HealthController } from './presentation/controllers/health.controller';
import { HealthMetricsController } from './presentation/controllers/health-metrics.controller';

describe('HealthModule', () => {
  it('registers the probe and metrics controllers by default', () => {
    expect(HealthModule.forRoot().controllers).toEqual([
      HealthController,
      HealthMetricsController,
    ]);
  });

  it('omits the metrics controller when the endpoint is disabled', () => {
    expect(HealthModule.forRoot({ metricsEndpoint: false }).controllers).toEqual([
      HealthController,
    ]);
  });

  it('marks both controllers public so orchestrator probes bypass global guards', () => {
    for (const controller of [HealthController, HealthMetricsController]) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller)).toBe(true);
      expect(Reflect.getMetadata(IGNORE_CAPTCHA, controller)).toBe(true);
    }
  });

  it('registers the built-in database and cache indicators by default', () => {
    const { providers } = HealthModule.forRoot();

    expect(providers).toContain(DatabaseHealthIndicator);
    expect(providers).toContain(CacheHealthIndicator);
  });

  it('omits built-in indicators the host opts out of', () => {
    const { providers } = HealthModule.forRoot({
      databaseIndicator: false,
      cacheIndicator: false,
    });

    expect(providers).not.toContain(DatabaseHealthIndicator);
    expect(providers).not.toContain(CacheHealthIndicator);
  });

  it('exports the facade so other modules can check health programmatically', () => {
    expect(HealthModule.forRoot().exports).toEqual([HealthFacade, HEALTH_OPTIONS]);
  });

  it('rejects invalid options at bootstrap', () => {
    expect(() => HealthModule.forRoot({ checkTimeoutMs: -1 })).toThrow();
  });

  it('accepts wiring options alongside the factory when registered asynchronously', () => {
    const module = HealthModule.forRootAsync({
      useFactory: () => ({ serviceName: 'orders-api' }),
      metricsEndpoint: false,
    });

    expect(module.controllers).toEqual([HealthController]);
  });
});
