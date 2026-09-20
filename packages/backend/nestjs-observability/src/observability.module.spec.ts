import { ObservabilityModule, OBSERVABILITY_OPTIONS } from '@ssdev-toolkit/nestjs-observability';

describe('ObservabilityModule', () => {
  describe('forRoot()', () => {
    it('returns a DynamicModule', () => {
      const mod = ObservabilityModule.forRoot({});
      expect(mod).toBeDefined();
      expect(mod.module).toBe(ObservabilityModule);
    });

    it('provides OBSERVABILITY_OPTIONS', () => {
      const opts = { slack: { webhookUrl: 'https://hooks.slack.com/xxx' } };
      const mod = ObservabilityModule.forRoot(opts);
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OBSERVABILITY_OPTIONS,
      );
      expect(provider?.useValue).toMatchObject(opts);
    });

    it('is configured through OBSERVABILITY_OPTIONS only', () => {
      const mod = ObservabilityModule.forRoot({
        environment: 'prod',
        alertOnEnvironments: ['prod'],
      });
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OBSERVABILITY_OPTIONS,
      );
      expect(provider?.useValue).toMatchObject({
        environment: 'prod',
        alertOnEnvironments: ['prod'],
      });
    });

    it('accepts an empty options object', () => {
      expect(() => ObservabilityModule.forRoot({})).not.toThrow();
    });
  });

  describe('forRootAsync()', () => {
    it('creates an async DynamicModule', () => {
      const mod = ObservabilityModule.forRootAsync({
        useFactory: () => ({
          slack: { webhookUrl: 'https://hooks.slack.com/test' },
        }),
      });
      expect(mod.module).toBe(ObservabilityModule);
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OBSERVABILITY_OPTIONS,
      );
      expect(typeof provider.useFactory).toBe('function');
    });

    it('throws when async factory returns invalid options', async () => {
      const mod = ObservabilityModule.forRootAsync({
        useFactory: () => ({
          slack: { webhookUrl: 'not-a-url' },
        }),
      });
      const provider = (mod.providers as any[]).find(
        (p) => p.provide === OBSERVABILITY_OPTIONS,
      );

      await expect(provider.useFactory()).rejects.toThrow(
        '[ObservabilityModule] Config validation failed:',
      );
    });
  });
});
