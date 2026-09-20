import { ServiceStatus } from '../../../domain/enums/service-status.enum';
import type { IRuntimeMetricsPort, RuntimeSnapshot } from '../../../domain/ports/runtime-metrics.port';
import { HealthOptionsSchema } from '../../../health.schema';
import { GetMetricsHandler } from './get-metrics.handler';

const MB = 1024 * 1024;

const snapshot: RuntimeSnapshot = {
  uptimeSeconds: 60,
  pid: 1,
  nodeVersion: 'v22.14.0',
  platform: 'linux',
  arch: 'x64',
  cpuCount: 4,
  processMemory: {
    rssBytes: 50 * MB,
    heapTotalBytes: 40 * MB,
    heapUsedBytes: 10 * MB,
    externalBytes: 0,
    arrayBuffersBytes: 0,
  },
  systemMemory: { totalBytes: 400 * MB, freeBytes: 100 * MB },
  cpu: { userMicros: 2_000, systemMicros: 1_000 },
  loadAverage: { oneMinute: 0, fiveMinutes: 0, fifteenMinutes: 0 },
};

describe('GetMetricsHandler', () => {
  const port: IRuntimeMetricsPort = { capture: jest.fn().mockReturnValue(snapshot) };

  it('maps a runtime snapshot onto the metrics payload', async () => {
    const handler = new GetMetricsHandler(port, HealthOptionsSchema.parse({}));

    const result = await handler.execute();

    expect(result.status).toBe(ServiceStatus.OK);
    expect(result.pid).toBe(1);
    expect(result.cpuCount).toBe(4);
    expect(result.memory.process.heapUsedMb).toBe(10);
    expect(result.memory.process.heapUsedPercent).toBe(25);
    expect(result.memory.system.usedPercent).toBe(75);
    expect(result.cpu.userMs).toBe(2);
    expect(port.capture).toHaveBeenCalled();
  });
});
