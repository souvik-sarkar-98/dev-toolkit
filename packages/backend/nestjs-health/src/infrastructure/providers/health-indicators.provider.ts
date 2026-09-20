import type { Provider, Type } from '@nestjs/common';
import { DuplicateHealthIndicatorError } from '../../domain/errors/health.errors';
import {
  HEALTH_INDICATORS,
  type HealthCheckDefinition,
  type IHealthIndicator,
} from '../../domain/ports/health-indicator.port';
import { CallbackHealthIndicator } from '../indicators/callback-health.indicator';

/**
 * Collapses class-based indicators (resolved through DI) and inline callback
 * checks into the single `IHealthIndicator[]` the runner consumes.
 *
 * Nest has no multi-provider concept, so the injected classes are fixed when the
 * module is built and aggregated here by a factory.
 */
export function createHealthIndicatorsProvider(
  indicatorTypes: Type<IHealthIndicator>[],
  checks: HealthCheckDefinition[],
): Provider<readonly IHealthIndicator[]> {
  return {
    provide: HEALTH_INDICATORS,
    useFactory: (...resolved: IHealthIndicator[]) => {
      const indicators: IHealthIndicator[] = [
        ...resolved,
        ...checks.map((check) => new CallbackHealthIndicator(check)),
      ];
      assertUniqueNames(indicators);
      return Object.freeze(indicators);
    },
    inject: indicatorTypes,
  };
}

function assertUniqueNames(indicators: readonly IHealthIndicator[]): void {
  const seen = new Set<string>();
  for (const indicator of indicators) {
    if (seen.has(indicator.name)) {
      throw new DuplicateHealthIndicatorError(indicator.name);
    }
    seen.add(indicator.name);
  }
}
