import { Logger } from '@nestjs/common';
import { HealthStatus } from '../../domain/enums/health-status.enum';
import type { IHealthIndicator } from '../../domain/ports/health-indicator.port';
import { HealthOptionsSchema, type HealthModuleOptions } from '../../health.schema';
import { HealthCheckRunner } from './health-check-runner.service';

const options = (overrides: Partial<HealthModuleOptions> = {}): HealthModuleOptions => ({
  ...HealthOptionsSchema.parse({}),
  ...overrides,
});

const indicator = (
  name: string,
  check: IHealthIndicator['check'],
  critical?: boolean,
): IHealthIndicator => ({ name, critical, check });

describe('HealthCheckRunner', () => {
  beforeEach(() => {
    // Failing indicators are the point of most of these cases — keep the
    // expected warnings out of the test output.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no results when nothing is registered', async () => {
    const runner = new HealthCheckRunner([], options());

    await expect(runner.runAll()).resolves.toEqual([]);
  });

  it('records a passing indicator as up', async () => {
    const runner = new HealthCheckRunner(
      [indicator('database', async () => ({ healthy: true }))],
      options(),
    );

    const [result] = await runner.runAll();

    expect(result.name).toBe('database');
    expect(result.status).toBe(HealthStatus.UP);
    expect(result.critical).toBe(true);
  });

  it('records a failing indicator as down and keeps its message', async () => {
    const runner = new HealthCheckRunner(
      [indicator('redis', async () => ({ healthy: false, message: 'no round-trip' }))],
      options(),
    );

    const [result] = await runner.runAll();

    expect(result.status).toBe(HealthStatus.DOWN);
    expect(result.message).toBe('no round-trip');
  });

  it('converts a thrown error into a down result rather than rejecting', async () => {
    const runner = new HealthCheckRunner(
      [
        indicator('database', async () => {
          throw new Error('connection refused');
        }),
      ],
      options(),
    );

    const [result] = await runner.runAll();

    expect(result.status).toBe(HealthStatus.DOWN);
    expect(result.message).toBe('connection refused');
  });

  it('marks an indicator down once it exceeds the timeout', async () => {
    const runner = new HealthCheckRunner(
      [indicator('slow', () => new Promise<never>(() => undefined))],
      options({ checkTimeoutMs: 10 }),
    );

    const [result] = await runner.runAll();

    expect(result.status).toBe(HealthStatus.DOWN);
    expect(result.message).toContain('did not respond within 10ms');
  });

  it('carries the per-indicator critical flag through, defaulting to true', async () => {
    const runner = new HealthCheckRunner(
      [
        indicator('search', async () => ({ healthy: false }), false),
        indicator('database', async () => ({ healthy: false })),
      ],
      options(),
    );

    const [search, database] = await runner.runAll();

    expect(search.critical).toBe(false);
    expect(search.isBlocking).toBe(false);
    expect(database.critical).toBe(true);
    expect(database.isBlocking).toBe(true);
  });

  it('runs every indicator even when one of them fails', async () => {
    const healthy = jest.fn().mockResolvedValue({ healthy: true });
    const runner = new HealthCheckRunner(
      [
        indicator('database', async () => {
          throw new Error('down');
        }),
        indicator('redis', healthy),
      ],
      options(),
    );

    const results = await runner.runAll();

    expect(healthy).toHaveBeenCalled();
    expect(results.map((result) => result.status)).toEqual([
      HealthStatus.DOWN,
      HealthStatus.UP,
    ]);
  });
});
