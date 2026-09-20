import { NodeRuntimeMetricsAdapter } from './node-runtime-metrics.adapter';

describe('NodeRuntimeMetricsAdapter', () => {
  const snapshot = new NodeRuntimeMetricsAdapter().capture();

  it('reads process identity from the current runtime', () => {
    expect(snapshot.pid).toBe(process.pid);
    expect(snapshot.nodeVersion).toBe(process.version);
    expect(snapshot.platform).toBe(process.platform);
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(snapshot.cpuCount).toBeGreaterThan(0);
  });

  it('reads raw memory counters in bytes', () => {
    expect(snapshot.processMemory.rssBytes).toBeGreaterThan(0);
    expect(snapshot.processMemory.heapUsedBytes).toBeGreaterThan(0);
    expect(snapshot.systemMemory.totalBytes).toBeGreaterThan(0);
    expect(snapshot.systemMemory.freeBytes).toBeGreaterThanOrEqual(0);
  });

  it('reads cpu usage and load average', () => {
    expect(snapshot.cpu.userMicros).toBeGreaterThanOrEqual(0);
    expect(snapshot.cpu.systemMicros).toBeGreaterThanOrEqual(0);
    expect(snapshot.loadAverage.oneMinute).toBeGreaterThanOrEqual(0);
    expect(snapshot.loadAverage.fiveMinutes).toBeGreaterThanOrEqual(0);
    expect(snapshot.loadAverage.fifteenMinutes).toBeGreaterThanOrEqual(0);
  });
});
