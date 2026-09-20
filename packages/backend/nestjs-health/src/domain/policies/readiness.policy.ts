import { HealthCheckResult } from '../value-objects/health-check-result.vo';

/**
 * Decides whether a set of check results means the instance can serve traffic.
 *
 * A non-critical dependency being down is a degradation, not an outage: the
 * orchestrator should keep routing to this pod rather than restart it.
 */
export class ReadinessPolicy {
  static isReady(checks: readonly HealthCheckResult[]): boolean {
    return !checks.some((check) => check.isBlocking);
  }

  /** Ready overall, but at least one optional dependency is down. */
  static isDegraded(checks: readonly HealthCheckResult[]): boolean {
    return (
      ReadinessPolicy.isReady(checks) && checks.some((check) => !check.isUp)
    );
  }
}
