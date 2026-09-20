import { HealthStatus } from '../enums/health-status.enum';
import { ServiceStatus } from '../enums/service-status.enum';
import { HealthCheckResult } from './health-check-result.vo';
import { ReadinessReport } from './readiness-report.vo';
import { ServiceIdentity } from './service-identity.vo';

const checkedAt = new Date('2026-08-01T10:00:00.000Z');
const identity = ServiceIdentity.of('orders-api', '1.4.2');

describe('ReadinessReport', () => {
  it('reports ok when every check is up', () => {
    const report = ReadinessReport.from(
      [
        HealthCheckResult.up({ name: 'database', critical: true, durationMs: 4 }),
        HealthCheckResult.up({ name: 'redis', critical: true, durationMs: 2 }),
      ],
      identity,
      checkedAt,
    );

    expect(report.ready).toBe(true);
    expect(report.status).toBe(ServiceStatus.OK);
    expect(report.toStatusMap()).toEqual({
      database: HealthStatus.UP,
      redis: HealthStatus.UP,
    });
    expect(report.failedChecks).toHaveLength(0);
  });

  it('reports error and lists failures when a critical check is down', () => {
    const report = ReadinessReport.from(
      [
        HealthCheckResult.down({
          name: 'database',
          critical: true,
          durationMs: 9,
          message: 'connection refused',
        }),
      ],
      identity,
      checkedAt,
    );

    expect(report.ready).toBe(false);
    expect(report.status).toBe(ServiceStatus.ERROR);
    expect(report.toStatusMap()).toEqual({ database: HealthStatus.DOWN });
    expect(report.failedChecks.map((check) => check.name)).toEqual(['database']);
  });

  it('does not leak the caller reference to checkedAt', () => {
    const mutable = new Date(checkedAt);
    const report = ReadinessReport.from([], identity, mutable);

    mutable.setFullYear(1999);

    expect(report.checkedAt.toISOString()).toBe('2026-08-01T10:00:00.000Z');
  });
});
