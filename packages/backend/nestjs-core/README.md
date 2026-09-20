# `@ssdev-toolkit/nestjs-core`

Foundation for every other `@ssdev-toolkit` NestJS package: domain primitives, HTTP envelopes, bootstrap helpers, and `CoreModule`.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core
```

The host app should already depend on NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/cqrs` when using events).

## What it does

- **Domain** — `AggregateRoot`, `BaseDomain`, `Page`, `Criteria` / `BaseFilter`, `IRepository`, `BusinessError`, entity-access policies, `IUserLookupPort`, `ICACHE_PORT`.
- **Application** — `ApplyTryCatch`, `AppTechnicalError`, small date/condition helpers.
- **Infrastructure** — `bootstrapApp` / `applyConfig` (prefix, CORS, helmet, validation pipe, Swagger), env/crypto utilities, trace context, `BaseDynamicModule`.
- **Presentation** — `SuccessResponse` envelope, `GlobalExceptionFilter`, `ApiAutoResponse*` Swagger helpers, `PagedResponse`.

## Usage

```ts
// app.module.ts
import { CoreModule } from '@ssdev-toolkit/nestjs-core';

@Module({ imports: [CoreModule, /* CqrsModule, feature modules */] })
export class AppModule {}
```

```ts
// main.ts
import { bootstrapApp } from '@ssdev-toolkit/nestjs-core';
import { AppModule } from './app.module';

const app = await bootstrapApp(AppModule, {
  globalPrefix: 'api',
  corsOrigins: process.env.CORS_ORIGINS?.split(','),
  appName: 'MyService',
});
await app.listen(process.env.PORT ?? 3000);
```

`CoreModule` is `@Global()`: exception filter, success envelope interceptor, and request timing. HTTP adapter options stay in `bootstrapApp` / `applyConfig`, not in the module.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-core
```

Overview: [root README](../../../README.md).
