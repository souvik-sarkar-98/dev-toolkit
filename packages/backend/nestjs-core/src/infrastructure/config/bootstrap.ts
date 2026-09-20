import { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { applyConfig, AppConfigOptions } from './app.config';

/**
 * Creates a NestJS application and immediately applies the standard
 * HTTP-adapter configuration via `applyConfig()`.
 *
 * Use this as the single entry-point in `main.ts` to reduce boilerplate.
 * The returned `INestApplication` is fully configured but not yet listening —
 * call `app.listen(port)` after any additional setup (e.g. microservice
 * transports, custom middleware, versioning).
 *
 * `GlobalExceptionFilter` and `TimingInterceptor` are wired through the DI
 * container — ensure `CoreModule` is imported in the root `AppModule`.
 *
 * @example
 * // main.ts
 * import { bootstrapApp } from '@ssdev-toolkit/nestjs-core';
 * import { AppModule } from './app.module';
 *
 * async function main() {
 *   const app = await bootstrapApp(AppModule, {
 *     globalPrefix: 'api',
 *     corsOrigins: process.env.CORS_ORIGINS?.split(','),
 *     logLevel: 'log',
 *     appName: 'MyService',
 *   });
 *   await app.listen(process.env.PORT ?? 3000);
 * }
 * main();
 */
export async function bootstrapApp(
  appModule: Type<any>,
  options: AppConfigOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(appModule);
  applyConfig(app, options);
  return app;
}
