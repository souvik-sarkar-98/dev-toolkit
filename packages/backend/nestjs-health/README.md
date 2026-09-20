# `@ssdev-toolkit/nestjs-health`

HTTP liveness, readiness, and optional metrics probes. Orchestrators call these without credentials (`@Public()`).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-health
```

Optional: `@ssdev-toolkit/nestjs-persistence` (database indicator) and `@ssdev-toolkit/nestjs-auth` (already a package dependency for `@Public` / `@IgnoreCaptcha`).

## What it does

- `GET /health` — liveness
- `GET /ready` — readiness (aggregates registered indicators)
- `GET /metrics` — runtime snapshot (can be disabled)

Built-in indicators: database, cache, plus host `HEALTH_INDICATORS` / callback checks. Programmatic API: `HealthFacade`.

## Usage

```ts
HealthModule.forRoot({
  serviceName: 'api',
  databaseIndicator: true,
  metricsEndpoint: true,
});
```

Add custom probes with `indicators` (injectable classes) or `checks` (inline definitions). Set `databaseIndicator: false` when the host has no Prisma database.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-health
```

Overview: [root README](../../../README.md).
