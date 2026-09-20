import type {
  CpuUsageSnapshot,
  LoadAverageSnapshot,
  RuntimeSnapshot,
} from '../ports/runtime-metrics.port';
import { ServiceIdentity } from './service-identity.vo';

export interface ProcessMemoryMetrics {
  rssBytes: number;
  rssMb: number;
  heapTotalBytes: number;
  heapTotalMb: number;
  heapUsedBytes: number;
  heapUsedMb: number;
  externalBytes: number;
  externalMb: number;
  arrayBuffersBytes: number;
  arrayBuffersMb: number;
  heapUsedPercent: number;
}

export interface SystemMemoryMetrics {
  totalBytes: number;
  totalMb: number;
  freeBytes: number;
  freeMb: number;
  usedBytes: number;
  usedMb: number;
  usedPercent: number;
}

export interface CpuMetrics extends CpuUsageSnapshot {
  userMs: number;
  systemMs: number;
}

export interface RuntimeDescriptor {
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
}

const BYTES_PER_MB = 1024 * 1024;
const MICROS_PER_MS = 1000;

/**
 * Immutable view over one runtime reading. Holds every unit conversion and
 * ratio so the adapter stays a thin `process`/`os` reader.
 */
export class RuntimeMetrics {
  readonly capturedAt: Date;
  readonly identity: ServiceIdentity;

  private constructor(
    private readonly snapshot: RuntimeSnapshot,
    identity: ServiceIdentity,
    capturedAt: Date,
  ) {
    this.identity = identity;
    this.capturedAt = new Date(capturedAt.getTime());
  }

  static from(
    snapshot: RuntimeSnapshot,
    identity: ServiceIdentity,
    capturedAt: Date,
  ): RuntimeMetrics {
    return new RuntimeMetrics(snapshot, identity, capturedAt);
  }

  get uptimeSeconds(): number {
    return RuntimeMetrics.round(this.snapshot.uptimeSeconds, 2);
  }

  get runtime(): RuntimeDescriptor {
    const { pid, nodeVersion, platform, arch, cpuCount } = this.snapshot;
    return { pid, nodeVersion, platform, arch, cpuCount };
  }

  get processMemory(): ProcessMemoryMetrics {
    const memory = this.snapshot.processMemory;
    return {
      rssBytes: memory.rssBytes,
      rssMb: RuntimeMetrics.toMb(memory.rssBytes),
      heapTotalBytes: memory.heapTotalBytes,
      heapTotalMb: RuntimeMetrics.toMb(memory.heapTotalBytes),
      heapUsedBytes: memory.heapUsedBytes,
      heapUsedMb: RuntimeMetrics.toMb(memory.heapUsedBytes),
      externalBytes: memory.externalBytes,
      externalMb: RuntimeMetrics.toMb(memory.externalBytes),
      arrayBuffersBytes: memory.arrayBuffersBytes,
      arrayBuffersMb: RuntimeMetrics.toMb(memory.arrayBuffersBytes),
      heapUsedPercent: RuntimeMetrics.percent(memory.heapUsedBytes, memory.heapTotalBytes),
    };
  }

  get systemMemory(): SystemMemoryMetrics {
    const { totalBytes, freeBytes } = this.snapshot.systemMemory;
    const usedBytes = totalBytes - freeBytes;
    return {
      totalBytes,
      totalMb: RuntimeMetrics.toMb(totalBytes),
      freeBytes,
      freeMb: RuntimeMetrics.toMb(freeBytes),
      usedBytes,
      usedMb: RuntimeMetrics.toMb(usedBytes),
      usedPercent: RuntimeMetrics.percent(usedBytes, totalBytes),
    };
  }

  get cpu(): CpuMetrics {
    const { userMicros, systemMicros } = this.snapshot.cpu;
    return {
      userMicros,
      systemMicros,
      userMs: Math.round(userMicros / MICROS_PER_MS),
      systemMs: Math.round(systemMicros / MICROS_PER_MS),
    };
  }

  get loadAverage(): LoadAverageSnapshot {
    return { ...this.snapshot.loadAverage };
  }

  private static toMb(bytes: number): number {
    return RuntimeMetrics.round(bytes / BYTES_PER_MB, 2);
  }

  private static percent(part: number, total: number): number {
    if (total <= 0) return 0;
    return RuntimeMetrics.round((part / total) * 100, 2);
  }

  private static round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
