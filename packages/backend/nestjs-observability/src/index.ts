// Module
export { ObservabilityModule } from './observability.module';
export type {
  ObservabilityModuleAsyncOptions,
  ObservabilityModuleRootOptions,
  ObservabilityModuleOptions,
} from './observability.module';

// Schema / config
export { ObservabilityOptionsSchema, OBSERVABILITY_OPTIONS, normalizeEnvironment } from './observability.schema';

// Domain — public contracts consumers may use for custom alert injection
export { IAlertPort } from './domain/ports/alert.port';
export type { AlertResult } from './domain/ports/alert.port';
export { AlertMessage } from './domain/value-objects/alert-message.vo';
export type { AlertMessageProps } from './domain/value-objects/alert-message.vo';
export type { AlertType } from './domain/enums/alert-type.enum';

// Application event — re-exported from @ssdev-toolkit/nestjs-core for consumer convenience
export { AppTechnicalError } from './application/events/app-technical-error.event';
