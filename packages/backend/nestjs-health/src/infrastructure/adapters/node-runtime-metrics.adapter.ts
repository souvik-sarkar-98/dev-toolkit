import os from 'os';
import { Injectable } from '@nestjs/common';
import type { IRuntimeMetricsPort, RuntimeSnapshot } from '../../domain/ports/runtime-metrics.port';

/** Reads raw counters from the Node process and host. All derivation happens in `RuntimeMetrics`. */
@Injectable()
export class NodeRuntimeMetricsAdapter implements IRuntimeMetricsPort {
  capture(): RuntimeSnapshot {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const [oneMinute, fiveMinutes, fifteenMinutes] = os.loadavg();

    return {
      uptimeSeconds: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length,
      processMemory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers,
      },
      systemMemory: {
        totalBytes: os.totalmem(),
        freeBytes: os.freemem(),
      },
      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
      },
      loadAverage: { oneMinute, fiveMinutes, fifteenMinutes },
    };
  }
}
