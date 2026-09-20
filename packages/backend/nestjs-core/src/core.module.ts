import { Global, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventBus } from '@nestjs/cqrs';
import { GlobalExceptionFilter } from './presentation/filters/global-exception.filter';
import { SuccessResponseInterceptor } from './presentation/interceptors/success-response.interceptor';
import { TimingInterceptor } from './presentation/interceptors/timing.interceptor';
import { registerHandlebarsHelpers } from './infrastructure/handlebars/handlebars-helpers';

/**
 * Global NestJS module that wires cross-cutting DI providers for the entire
 * application. Import once in the root `AppModule` — the `@Global()` decorator
 * makes all providers available everywhere without re-importing.
 *
 * Registered providers:
 * - `APP_FILTER`       → `GlobalExceptionFilter`  (maps domain/HTTP exceptions to
 *   structured error responses; publishes `AppTechnicalError` via `EventBus`
 *   for 5xx alerts when `CqrsModule` is present)
 * - `APP_INTERCEPTOR`  → `SuccessResponseInterceptor`  (wraps every successful
 *   controller return value in `SuccessResponse<T>` envelope)
 * - `APP_INTERCEPTOR`  → `TimingInterceptor`  (logs per-request method/URL/ms)
 *
 * Handlebars helpers are registered on the global Handlebars instance via
 * `onModuleInit()` — no separate module or service is needed.
 *
 * HTTP-adapter concerns (`setGlobalPrefix`, CORS, body-parser, compression,
 * helmet, Swagger, trust-proxy, ValidationPipe, shutdown hooks) are NOT handled
 * here — call `applyConfig(app, options)` in `main.ts` after `NestFactory.create()`.
 *
 * @example
 * // app.module.ts
 * import { CoreModule } from '@ssdev-toolkit/nestjs-core';
 *
 * @Module({ imports: [CoreModule, ...] })
 * export class AppModule {}
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      // useFactory ensures `environment` is always resolved at startup: when
      // NODE_ENV is not set we default to 'production' so error details are
      // never accidentally leaked in unrecognised environments.
      useFactory: (eventBus?: EventBus) =>
        new GlobalExceptionFilter(eventBus, process.env.NODE_ENV ?? 'production'),
      inject: [{ token: EventBus, optional: true }],
    },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
  ],
})
export class CoreModule implements OnModuleInit {
  onModuleInit() {
    registerHandlebarsHelpers();
  }
}
