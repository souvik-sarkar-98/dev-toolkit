import {
  DynamicModule,
  Global,
  Module,
  type ModuleMetadata,
  type Provider,
  type Type,
} from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BaseDynamicModule, DynamicModuleAsyncOptions } from '@ssdev-toolkit/nestjs-core';
import { GetLivenessHandler } from './application/queries/get-liveness/get-liveness.handler';
import { GetMetricsHandler } from './application/queries/get-metrics/get-metrics.handler';
import { GetReadinessHandler } from './application/queries/get-readiness/get-readiness.handler';
import { HealthCheckRunner } from './application/services/health-check-runner.service';
import { HealthFacade } from './application/services/health.facade';
import type {
  HealthCheckDefinition,
  IHealthIndicator,
} from './domain/ports/health-indicator.port';
import { IRuntimeMetricsPort } from './domain/ports/runtime-metrics.port';
import { HEALTH_OPTIONS, HealthOptionsSchema } from './health.schema';
import type { HealthModuleInput } from './health.schema';
import { NodeRuntimeMetricsAdapter } from './infrastructure/adapters/node-runtime-metrics.adapter';
import { CacheHealthIndicator } from './infrastructure/indicators/cache-health.indicator';
import { DatabaseHealthIndicator } from './infrastructure/indicators/database-health.indicator';
import { createHealthIndicatorsProvider } from './infrastructure/providers/health-indicators.provider';
import { HealthController } from './presentation/controllers/health.controller';
import { HealthMetricsController } from './presentation/controllers/health-metrics.controller';

export type { HealthModuleOptions } from './health.schema';

const QUERY_HANDLERS = [GetLivenessHandler, GetReadinessHandler, GetMetricsHandler];

/**
 * Structural configuration. Unlike the values in `health.schema.ts`, these must
 * be known synchronously — they decide which providers and controllers exist,
 * which is fixed before the DI container starts.
 */
export interface HealthModuleWiringOptions {
  /** Set false to omit the metrics endpoint entirely, including from Swagger. Default true. */
  metricsEndpoint?: boolean;
  /**
   * Custom indicator classes. Registered as providers in this module, so their
   * dependencies must be global or reachable through `imports`.
   */
  indicators?: Type<IHealthIndicator>[];
  /** Inline probes for checks that need no dependency injection. */
  checks?: HealthCheckDefinition[];
  /** Set false when the host has no `@ssdev-toolkit/nestjs-persistence` database. Default true. */
  databaseIndicator?: boolean;
  /** Set false when the host has no cache configured. Default true. */
  cacheIndicator?: boolean;
  imports?: ModuleMetadata['imports'];
}

export interface HealthModuleRootOptions
  extends HealthModuleInput,
  HealthModuleWiringOptions { }

export interface HealthModuleAsyncOptions
  extends DynamicModuleAsyncOptions<HealthModuleInput>,
  HealthModuleWiringOptions { }

/**
 * Liveness, readiness, and runtime-metrics probes for any NestJS application,
 * served at `/health`, `/ready`, and `/metrics`.
 *
 * Readiness is assembled from `IHealthIndicator` implementations: the database
 * and cache probes ship built in, and hosts add their own through `indicators`
 * or `checks`.
 *
 * @example
 * HealthModule.forRoot({
 *   serviceName: 'orders-api',
 *   checks: [{ name: 'search', critical: false, check: () => searchClient.ping() }],
 * })
 */
@Global()
@Module({})
export class HealthModule extends BaseDynamicModule {
  static forRoot(options: HealthModuleRootOptions = {}): DynamicModule {
    const { metricsEndpoint, indicators, checks, databaseIndicator, cacheIndicator,
      imports, ...runtimeOptions } = options;

    return HealthModule._build(
      [
        HealthModule.createOptionsProvider(
          HEALTH_OPTIONS,
          HealthOptionsSchema,
          runtimeOptions,
        ),
      ],
      { metricsEndpoint, indicators, checks, databaseIndicator, cacheIndicator, imports },
    );
  }

  static forRootAsync(options: HealthModuleAsyncOptions): DynamicModule {
    const { useFactory, inject, ...wiring } = options;

    return HealthModule._build(
      [
        HealthModule.createAsyncOptionsProvider(HEALTH_OPTIONS, HealthOptionsSchema, {
          useFactory,
          inject,
          imports: options.imports,
        }),
      ],
      wiring,
    );
  }

  private static _build(
    optionsProviders: Provider[],
    wiring: HealthModuleWiringOptions,
  ): DynamicModule {
    const indicatorTypes = HealthModule.resolveIndicatorTypes(wiring);

    return {
      module: HealthModule,
      imports: [CqrsModule, ...(wiring.imports ?? [])],
      controllers: [
        HealthController,
        ...(wiring.metricsEndpoint !== false ? [HealthMetricsController] : []),
      ],
      providers: [
        ...optionsProviders,
        ...indicatorTypes,
        createHealthIndicatorsProvider(indicatorTypes, wiring.checks ?? []),
        { provide: IRuntimeMetricsPort, useClass: NodeRuntimeMetricsAdapter },
        HealthCheckRunner,
        HealthFacade,
        ...QUERY_HANDLERS,
      ],
      exports: [HealthFacade, HEALTH_OPTIONS],
    };
  }

  private static resolveIndicatorTypes(
    wiring: HealthModuleWiringOptions,
  ): Type<IHealthIndicator>[] {
    const types: Type<IHealthIndicator>[] = [];
    if (wiring.databaseIndicator !== false) types.push(DatabaseHealthIndicator);
    if (wiring.cacheIndicator !== false) types.push(CacheHealthIndicator);
    types.push(...(wiring.indicators ?? []));
    return types;
  }
}
