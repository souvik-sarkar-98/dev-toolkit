import type { RuntimeSnapshot } from '../ports/runtime-metrics.port';
import { RuntimeMetrics } from './runtime-metrics.vo';
import { ServiceIdentity } from './service-identity.vo';

const MB = 1024 * 1024;

const snapshot: RuntimeSnapshot = {
  uptimeSeconds: 12.3456,
  pid: 4242,
  nodeVersion: 'v22.14.0',
  platform: 'linux',
  arch: 'x64',
  cpuCount: 8,
  processMemory: {
    rssBytes: 100 * MB,
    heapTotalBytes: 80 * MB,
    heapUsedBytes: 20 * MB,
    externalBytes: 5 * MB,
    arrayBuffersBytes: 1 * MB,
  },
  systemMemory: { totalBytes: 1000 * MB, freeBytes: 250 * MB },
  cpu: { userMicros: 1_500_000, systemMicros: 500_000 },
  loadAverage: { oneMinute: 0.5, fiveMinutes: 0.25, fifteenMinutes: 0.1 },
};

const metrics = RuntimeMetrics.from(
  snapshot,
  ServiceIdentity.anonymous(),
  new Date('2026-08-01T10:00:00.000Z'),
);

describe('RuntimeMetrics', () => {
  it('rounds uptime to two decimals', () => {
    expect(metrics.uptimeSeconds).toBe(12.35);
  });

  it('converts process memory to megabytes and a heap ratio', () => {
    expect(metrics.processMemory).toEqual({
      rssBytes: 100 * MB,
      rssMb: 100,
      heapTotalBytes: 80 * MB,
      heapTotalMb: 80,
      heapUsedBytes: 20 * MB,
      heapUsedMb: 20,
      externalBytes: 5 * MB,
      externalMb: 5,
      arrayBuffersBytes: 1 * MB,
      arrayBuffersMb: 1,
      heapUsedPercent: 25,
    });
  });

  it('derives used system memory from total minus free', () => {
    expect(metrics.systemMemory.usedBytes).toBe(750 * MB);
    expect(metrics.systemMemory.usedMb).toBe(750);
    expect(metrics.systemMemory.usedPercent).toBe(75);
  });

  it('converts cpu microseconds to milliseconds', () => {
    expect(metrics.cpu).toEqual({
      userMicros: 1_500_000,
      systemMicros: 500_000,
      userMs: 1500,
      systemMs: 500,
    });
  });

  it('reports zero percent rather than dividing by zero', () => {
    const empty = RuntimeMetrics.from(
      {
        ...snapshot,
        processMemory: { ...snapshot.processMemory, heapTotalBytes: 0, heapUsedBytes: 0 },
        systemMemory: { totalBytes: 0, freeBytes: 0 },
      },
      ServiceIdentity.anonymous(),
      new Date(),
    );

    expect(empty.processMemory.heapUsedPercent).toBe(0);
    expect(empty.systemMemory.usedPercent).toBe(0);
  });

  it('exposes the runtime descriptor verbatim', () => {
    expect(metrics.runtime).toEqual({
      pid: 4242,
      nodeVersion: 'v22.14.0',
      platform: 'linux',
      arch: 'x64',
      cpuCount: 8,
    });
  });
});
