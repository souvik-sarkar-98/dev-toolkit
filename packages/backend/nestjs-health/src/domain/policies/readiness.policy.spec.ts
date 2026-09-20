import { HealthCheckResult } from '../value-objects/health-check-result.vo';
import { ReadinessPolicy } from './readiness.policy';

const up = (name: string, critical = true) =>
  HealthCheckResult.up({ name, critical, durationMs: 1 });
const down = (name: string, critical = true) =>
  HealthCheckResult.down({ name, critical, durationMs: 1 });

describe('ReadinessPolicy', () => {
  it('is ready when every check passes', () => {
    const checks = [up('database'), up('redis')];

    expect(ReadinessPolicy.isReady(checks)).toBe(true);
    expect(ReadinessPolicy.isDegraded(checks)).toBe(false);
  });

  it('is ready with no checks registered', () => {
    expect(ReadinessPolicy.isReady([])).toBe(true);
  });

  it('is not ready when a critical check fails', () => {
    const checks = [down('database'), up('redis')];

    expect(ReadinessPolicy.isReady(checks)).toBe(false);
    expect(ReadinessPolicy.isDegraded(checks)).toBe(false);
  });

  it('stays ready but degraded when only a non-critical check fails', () => {
    const checks = [up('database'), down('search', false)];

    expect(ReadinessPolicy.isReady(checks)).toBe(true);
    expect(ReadinessPolicy.isDegraded(checks)).toBe(true);
  });
});
