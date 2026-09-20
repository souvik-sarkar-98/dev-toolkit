# `@ssdev-toolkit/nestjs-observability`

Turns `AppTechnicalError` (and similar) into outbound alerts. The host injects `IAlertPort` (email, Teams, pager, …).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-observability
```

## What it does

- `ObservabilityModule.forRoot` / `forRootAsync`
- `IAlertPort`, `AlertMessage`
- Re-exports `AppTechnicalError` from core for convenience

`CoreModule`’s exception filter publishes technical errors on the CQRS event bus when `CqrsModule` is present; this module subscribes and forwards them to the alert port.

## Usage

```ts
ObservabilityModule.forRootAsync({
  useFactory: () => ({
    environment: process.env.NODE_ENV,
    serviceName: 'api',
  }),
});
```

Register `{ provide: IAlertPort, useClass: HostAlertAdapter }` in the host.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-observability
```

Overview: [root README](../../../README.md).
