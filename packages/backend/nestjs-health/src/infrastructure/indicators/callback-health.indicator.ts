import type {
  HealthCheckDefinition,
  HealthIndicatorOutcome,
  IHealthIndicator,
} from '../../domain/ports/health-indicator.port';

/** Adapts an inline `checks: [...]` entry to the `IHealthIndicator` contract. */
export class CallbackHealthIndicator implements IHealthIndicator {
  readonly name: string;
  readonly critical: boolean;

  constructor(private readonly definition: HealthCheckDefinition) {
    this.name = definition.name;
    this.critical = definition.critical ?? true;
  }

  async check(): Promise<HealthIndicatorOutcome> {
    const outcome = await this.definition.check();
    return typeof outcome === 'boolean' ? { healthy: outcome } : outcome;
  }
}
