import type { HealthStatus } from '../../domain/enums/health-status.enum';
import type { ServiceStatus } from '../../domain/enums/service-status.enum';
import type {
  CpuMetrics,
  ProcessMemoryMetrics,
  SystemMemoryMetrics,
} from '../../domain/value-objects/runtime-metrics.vo';
import type { LoadAverageSnapshot } from '../../domain/ports/runtime-metrics.port';

/** Per-check diagnostics, present only when `exposeCheckDetails` is enabled. */
export interface HealthCheckDetail {
  name: string;
  status: HealthStatus;
  critical: boolean;
  durationMs: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface LivenessResult {
  status: ServiceStatus;
  timestamp: string;
  service?: string;
  version?: string;
}

export interface ReadinessResult {
  status: ServiceStatus;
  ready: boolean;
  /** Ready, but at least one non-critical dependency is down. */
  degraded: boolean;
  checks: Record<string, HealthStatus>;
  details?: HealthCheckDetail[];
  timestamp: string;
  service?: string;
  version?: string;
}

export interface MetricsResult {
  status: ServiceStatus;
  timestamp: string;
  service?: string;
  version?: string;
  uptimeSeconds: number;
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuCount: number;
  memory: {
    process: ProcessMemoryMetrics;
    system: SystemMemoryMetrics;
  };
  cpu: CpuMetrics;
  loadAverage: LoadAverageSnapshot;
}
