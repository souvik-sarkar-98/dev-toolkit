import { ServiceStatus } from '../../domain/enums/service-status.enum';
import type { HealthCheckResult } from '../../domain/value-objects/health-check-result.vo';
import type { LivenessReport } from '../../domain/value-objects/liveness-report.vo';
import type { ReadinessReport } from '../../domain/value-objects/readiness-report.vo';
import type { RuntimeMetrics } from '../../domain/value-objects/runtime-metrics.vo';
import type { ServiceIdentity } from '../../domain/value-objects/service-identity.vo';
import type {
  HealthCheckDetail,
  LivenessResult,
  MetricsResult,
  ReadinessResult,
} from '../dtos/health.dto';

/** Translates domain reports into the wire payloads served by the probes. */
export class HealthMapper {
  static toLivenessResult(report: LivenessReport): LivenessResult {
    return {
      status: report.status,
      timestamp: report.checkedAt.toISOString(),
      ...HealthMapper.identityFields(report.identity),
    };
  }

  static toReadinessResult(report: ReadinessReport, exposeDetails: boolean): ReadinessResult {
    return {
      status: report.status,
      ready: report.ready,
      degraded: report.degraded,
      checks: report.toStatusMap(),
      ...(exposeDetails ? { details: report.checks.map(HealthMapper.toCheckDetail) } : {}),
      timestamp: report.checkedAt.toISOString(),
      ...HealthMapper.identityFields(report.identity),
    };
  }

  static toMetricsResult(metrics: RuntimeMetrics): MetricsResult {
    return {
      status: ServiceStatus.OK,
      timestamp: metrics.capturedAt.toISOString(),
      ...HealthMapper.identityFields(metrics.identity),
      uptimeSeconds: metrics.uptimeSeconds,
      ...metrics.runtime,
      memory: {
        process: metrics.processMemory,
        system: metrics.systemMemory,
      },
      cpu: metrics.cpu,
      loadAverage: metrics.loadAverage,
    };
  }

  private static toCheckDetail(check: HealthCheckResult): HealthCheckDetail {
    return {
      name: check.name,
      status: check.status,
      critical: check.critical,
      durationMs: check.durationMs,
      ...(check.message ? { message: check.message } : {}),
      ...(check.details ? { details: { ...check.details } } : {}),
    };
  }

  private static identityFields(
    identity: ServiceIdentity,
  ): { service?: string; version?: string } {
    return {
      ...(identity.name ? { service: identity.name } : {}),
      ...(identity.version ? { version: identity.version } : {}),
    };
  }
}
