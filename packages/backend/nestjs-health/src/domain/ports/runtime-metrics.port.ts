/** Raw byte counters for the current process, as reported by the runtime. */
export interface ProcessMemorySnapshot {
  rssBytes: number;
  heapTotalBytes: number;
  heapUsedBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
}

/** Raw byte counters for the host machine. */
export interface SystemMemorySnapshot {
  totalBytes: number;
  freeBytes: number;
}

/** Cumulative CPU time consumed by the process, in microseconds. */
export interface CpuUsageSnapshot {
  userMicros: number;
  systemMicros: number;
}

/** Host load average over the three standard windows. */
export interface LoadAverageSnapshot {
  oneMinute: number;
  fiveMinutes: number;
  fifteenMinutes: number;
}

/** An unprocessed reading of the runtime. All derived values are computed in the domain. */
export interface RuntimeSnapshot {
  uptimeSeconds: number;
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
  processMemory: ProcessMemorySnapshot;
  systemMemory: SystemMemorySnapshot;
  cpu: CpuUsageSnapshot;
  loadAverage: LoadAverageSnapshot;
}

export const IRuntimeMetricsPort = Symbol('IRuntimeMetricsPort');

/** Port over the host runtime so the domain never touches `process` or `os` directly. */
export interface IRuntimeMetricsPort {
  capture(): RuntimeSnapshot;
}
