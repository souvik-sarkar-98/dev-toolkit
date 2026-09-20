import type { FactoryProvider } from '@nestjs/common';
import { DuplicateHealthIndicatorError } from '../../domain/errors/health.errors';
import type { IHealthIndicator } from '../../domain/ports/health-indicator.port';
import { createHealthIndicatorsProvider } from './health-indicators.provider';

const resolve = (
  provider: ReturnType<typeof createHealthIndicatorsProvider>,
  ...instances: IHealthIndicator[]
) => (provider as FactoryProvider).useFactory(...instances) as readonly IHealthIndicator[];

const stub = (name: string): IHealthIndicator => ({
  name,
  check: async () => ({ healthy: true }),
});

describe('createHealthIndicatorsProvider', () => {
  it('injects exactly the indicator classes it was given', () => {
    class DatabaseIndicator {}
    const provider = createHealthIndicatorsProvider([DatabaseIndicator as never], []);

    expect((provider as FactoryProvider).inject).toEqual([DatabaseIndicator]);
  });

  it('combines resolved classes with inline callback checks', () => {
    const provider = createHealthIndicatorsProvider([], [
      { name: 'search', critical: false, check: () => true },
    ]);

    const indicators = resolve(provider, stub('database'));

    expect(indicators.map((indicator) => indicator.name)).toEqual(['database', 'search']);
    expect(indicators[1].critical).toBe(false);
  });

  it('normalises a boolean callback result to an outcome', async () => {
    const provider = createHealthIndicatorsProvider([], [{ name: 'search', check: () => false }]);

    const [search] = resolve(provider);

    await expect(search.check()).resolves.toEqual({ healthy: false });
  });

  it('rejects duplicate names, which would silently hide a probe', () => {
    const provider = createHealthIndicatorsProvider([], [{ name: 'database', check: () => true }]);

    expect(() => resolve(provider, stub('database'))).toThrow(DuplicateHealthIndicatorError);
  });
});
