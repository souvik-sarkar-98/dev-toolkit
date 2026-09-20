# `@ssdev-toolkit/nestjs-json-store`

Named JSON documents with create / update / upsert / list. Other modules use `JsonStoreFacade`.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-json-store
```

The host registers `IJsonDocumentRepository` (typically Prisma). Optional `IJsonDocumentPayloadValidatorPort` (default no-op).

## What it does

- `JsonStoreModule.forRoot`
- HTTP controller for documents
- `JsonStoreFacade` for programmatic access (cron payloads, email templates, …)
- Errors: not found, duplicate key, invalid document

## Usage

```ts
await this.jsonStore.upsert(
  'cron:purge-notifications',
  'cron',
  { /* payload; use CronJobPayloadSchema when storing cron jobs */ },
);
```

Do not inject `IJsonDocumentRepository` from feature modules.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-json-store
```

Overview: [root README](../../../README.md).
