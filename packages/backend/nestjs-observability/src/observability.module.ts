import { HttpModule } from "@nestjs/axios";
import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { BaseDynamicModule, DynamicModuleAsyncOptions } from "@ssdev-toolkit/nestjs-core";
import { IAlertPort } from "./domain/ports/alert.port";
import { AppTechnicalErrorHandler } from "./application/handlers/events/on-app-technical-error/on-app-technical-error.handler";
import { SlackAlertAdapter } from "./infrastructure/adapters/slack-alert.adapter";
import type { ObservabilityModuleInput, ObservabilityModuleOptions } from "./observability.schema";
import {
  ObservabilityOptionsSchema,
  OBSERVABILITY_OPTIONS,
} from "./observability.schema";

export type { ObservabilityModuleOptions } from "./observability.schema";

export interface ObservabilityModuleRootOptions extends ObservabilityModuleInput {
  /**
   * Override the alert adapter. Defaults to `SlackAlertAdapter`.
   * The provided class must implement `IAlertPort` and be decorated with `@Injectable()`.
   */
  alertProvider?: Type<IAlertPort>;
}

export interface ObservabilityModuleAsyncOptions
  extends DynamicModuleAsyncOptions<ObservabilityModuleInput> {
  /**
   * Override the alert adapter. Defaults to `SlackAlertAdapter`.
   * The provided class must implement `IAlertPort` and be decorated with `@Injectable()`.
   */
  alertProvider?: Type<IAlertPort>;
}

@Global()
@Module({})
export class ObservabilityModule extends BaseDynamicModule {
  static forRoot(options: ObservabilityModuleRootOptions): DynamicModule {
    const { alertProvider, ...moduleOptions } = options;
    return ObservabilityModule._build(
      [
        ObservabilityModule.createOptionsProvider(
          OBSERVABILITY_OPTIONS,
          ObservabilityOptionsSchema,
          moduleOptions,
        ),
      ],
      [],
      alertProvider,
    );
  }

  static forRootAsync(options: ObservabilityModuleAsyncOptions): DynamicModule {
    return ObservabilityModule._build(
      [
        ObservabilityModule.createAsyncOptionsProvider(
          OBSERVABILITY_OPTIONS,
          ObservabilityOptionsSchema,
          options,
        ),
      ],
      options.imports,
      options.alertProvider,
    );
  }

  private static _build(
    optionsProviders: any[],
    extraImports: any[] = [],
    alertProvider?: Type<IAlertPort>,
  ): DynamicModule {
    const adapter = alertProvider ?? SlackAlertAdapter;
    return {
      module: ObservabilityModule,
      imports: [...extraImports, HttpModule, CqrsModule],
      providers: [
        ...optionsProviders,
        adapter,
        { provide: IAlertPort, useExisting: adapter },
        AppTechnicalErrorHandler,
      ],
      // Export the adapter so consumers can inject it for custom operational
      // alerts, and IAlertPort for DI-token–based injection.
      exports: [adapter, IAlertPort],
    };
  }
}
