// Module
export { HealthModule } from './health.module';
export type {
  HealthModuleAsyncOptions,
  HealthModuleRootOptions,
  HealthModuleWiringOptions,
  HealthModuleOptions,
} from './health.module';

// Schema / config
export { HealthOptionsSchema, HEALTH_OPTIONS } from './health.schema';
export type { HealthModuleInput } from './health.schema';

// Application — facade for programmatic health checks from other modules
export { HealthFacade } from './application/services/health.facade';
export { HealthCheckRunner } from './application/services/health-check-runner.service';

// Application — queries (dispatch via QueryBus when the facade is not enough)
export { GetLivenessQuery } from './application/queries/get-liveness/get-liveness.query';
export { GetReadinessQuery } from './application/queries/get-readiness/get-readiness.query';
export { GetMetricsQuery } from './application/queries/get-metrics/get-metrics.query';

// Application — result payloads
export type {
  HealthCheckDetail,
  LivenessResult,
  MetricsResult,
  ReadinessResult,
} from './application/dtos/health.dto';

// Domain — the contract hosts implement to add their own probes
export { HEALTH_INDICATORS } from './domain/ports/health-indicator.port';
export type {
  HealthCheckDefinition,
  HealthIndicatorOutcome,
  IHealthIndicator,
} from './domain/ports/health-indicator.port';
export { IRuntimeMetricsPort } from './domain/ports/runtime-metrics.port';
export type {
  CpuUsageSnapshot,
  LoadAverageSnapshot,
  ProcessMemorySnapshot,
  RuntimeSnapshot,
  SystemMemorySnapshot,
} from './domain/ports/runtime-metrics.port';

// Domain — enums, errors, policies, and value objects
export { HealthStatus } from './domain/enums/health-status.enum';
export { ServiceStatus } from './domain/enums/service-status.enum';
export {
  DuplicateHealthIndicatorError,
  HealthIndicatorTimeoutError,
  InvalidHealthIndicatorError,
} from './domain/errors/health.errors';
export { ReadinessPolicy } from './domain/policies/readiness.policy';
export { HealthCheckResult } from './domain/value-objects/health-check-result.vo';
export { LivenessReport } from './domain/value-objects/liveness-report.vo';
export { ReadinessReport } from './domain/value-objects/readiness-report.vo';
export { RuntimeMetrics } from './domain/value-objects/runtime-metrics.vo';
export type {
  CpuMetrics,
  ProcessMemoryMetrics,
  RuntimeDescriptor,
  SystemMemoryMetrics,
} from './domain/value-objects/runtime-metrics.vo';
export { ServiceIdentity } from './domain/value-objects/service-identity.vo';

// Infrastructure — built-in indicators, exported so hosts can subclass or re-register them
export { CacheHealthIndicator } from './infrastructure/indicators/cache-health.indicator';
export { DatabaseHealthIndicator } from './infrastructure/indicators/database-health.indicator';
export { CallbackHealthIndicator } from './infrastructure/indicators/callback-health.indicator';
export { NodeRuntimeMetricsAdapter } from './infrastructure/adapters/node-runtime-metrics.adapter';

// Presentation — response DTOs
export { LivenessResponseDto } from './presentation/dtos/liveness-response.dto';
export {
  HealthCheckDetailDto,
  ReadinessResponseDto,
} from './presentation/dtos/readiness-response.dto';
export {
  CpuDto,
  LoadAverageDto,
  MemoryDto,
  MetricsResponseDto,
  ProcessMemoryDto,
  SystemMemoryDto,
} from './presentation/dtos/metrics-response.dto';
