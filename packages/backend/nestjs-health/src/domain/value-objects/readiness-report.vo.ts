import { HealthStatus } from '../enums/health-status.enum';
import { ServiceStatus } from '../enums/service-status.enum';
import { ReadinessPolicy } from '../policies/readiness.policy';
import { HealthCheckResult } from './health-check-result.vo';
import { ServiceIdentity } from './service-identity.vo';

/** Immutable aggregate of every readiness check performed in one probe. */
export class ReadinessReport {
  readonly ready: boolean;
  readonly status: ServiceStatus;
  readonly degraded: boolean;
  readonly checks: readonly HealthCheckResult[];
  readonly identity: ServiceIdentity;
  readonly checkedAt: Date;

  private constructor(
    checks: readonly HealthCheckResult[],
    identity: ServiceIdentity,
    checkedAt: Date,
  ) {
    this.checks = Object.freeze([...checks]);
    this.ready = ReadinessPolicy.isReady(this.checks);
    this.degraded = ReadinessPolicy.isDegraded(this.checks);
    this.status = this.ready ? ServiceStatus.OK : ServiceStatus.ERROR;
    this.identity = identity;
    this.checkedAt = new Date(checkedAt.getTime());
  }

  static from(
    checks: readonly HealthCheckResult[],
    identity: ServiceIdentity,
    checkedAt: Date,
  ): ReadinessReport {
    return new ReadinessReport(checks, identity, checkedAt);
  }

  /** Flat `{ indicatorName: 'up' | 'down' }` view used by the probe payload. */
  toStatusMap(): Record<string, HealthStatus> {
    return this.checks.reduce<Record<string, HealthStatus>>((map, check) => {
      map[check.name] = check.status;
      return map;
    }, {});
  }

  get failedChecks(): readonly HealthCheckResult[] {
    return this.checks.filter((check) => !check.isUp);
  }
}
