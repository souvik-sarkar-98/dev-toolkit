import { Inject, Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorTimeoutError } from '../../domain/errors/health.errors';
import {
  HEALTH_INDICATORS,
  type HealthIndicatorOutcome,
  type IHealthIndicator,
} from '../../domain/ports/health-indicator.port';
import { HealthCheckResult } from '../../domain/value-objects/health-check-result.vo';
import { HEALTH_OPTIONS, type HealthModuleOptions } from '../../health.schema';

/**
 * Runs every registered indicator in parallel under a per-check timeout and
 * turns each outcome — including thrown errors — into a `HealthCheckResult`.
 * This never rejects: a probe that fails to answer is itself a health signal.
 */
@Injectable()
export class HealthCheckRunner {
  private readonly logger = new Logger(HealthCheckRunner.name);

  constructor(
    @Inject(HEALTH_INDICATORS) private readonly indicators: readonly IHealthIndicator[],
    @Inject(HEALTH_OPTIONS) private readonly options: HealthModuleOptions,
  ) {}

  async runAll(): Promise<HealthCheckResult[]> {
    return Promise.all(this.indicators.map((indicator) => this.run(indicator)));
  }

  private async run(indicator: IHealthIndicator): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    const critical = indicator.critical ?? true;

    try {
      const outcome = await this.withTimeout(indicator);
      const props = {
        name: indicator.name,
        critical,
        durationMs: Date.now() - startedAt,
        message: outcome.message,
        details: outcome.details,
      };
      return outcome.healthy ? HealthCheckResult.up(props) : HealthCheckResult.down(props);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Health indicator "${indicator.name}" failed: ${message}`);
      return HealthCheckResult.down({
        name: indicator.name,
        critical,
        durationMs: Date.now() - startedAt,
        message,
      });
    }
  }

  private async withTimeout(indicator: IHealthIndicator): Promise<HealthIndicatorOutcome> {
    const { checkTimeoutMs } = this.options;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.resolve(indicator.check()),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new HealthIndicatorTimeoutError(indicator.name, checkTimeoutMs)),
            checkTimeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
