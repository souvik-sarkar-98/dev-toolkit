# `@ssdev-toolkit/nestjs-cron`

Scheduled jobs (Quartz-style expressions) that enqueue work through a queue port. Persistence of job definitions is a host port (`CRON_JOB_STORE_PORT`).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-cron
```

Typical host wiring: JSON-store or Prisma for `ICronJobStorePort`, and `{ provide: CRON_JOB_QUEUE_PORT, useClass: QueueCronJobAdapter }` after `QueueModule.forRootAsync()`.

## What it does

- `CronModule.forRoot` / `forRootAsync` (export alias of `Cron2Module`)
- `CronExpression` / `normalizeToQuartz`
- Payload schema `CronJobPayloadSchema` for JSON-store documents
- Errors: `InvalidCronExpressionError`, `CronJobNotFoundError`

## Usage

```ts
CronModule.forRootAsync({
  imports: [IntegrationsModule],
  useFactory: () => ({ /* poll interval, timezone, … */ }),
});
```

The host must register `CRON_JOB_STORE_PORT` and `CRON_JOB_QUEUE_PORT` or startup validation fails.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-cron
```

Overview: [root README](../../../README.md).
