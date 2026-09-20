# `@ssdev-toolkit/nestjs-dms`

Document metadata plus blob storage. Default storage is Firebase; the host may pass `IStorageProvider` (for example Google Drive).

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-dms
```

The host registers `IDocumentRepository` and `IDocumentEntityAccessPort`. For Google Drive (or any non-Firebase provider), pass `storageProvider` into `DmsModule.forRoot` / `forRootAsync`.

## What it does

- `DmsModule.forRoot` / `forRootAsync`
- `DmsFacade` — upload, list, download, signed URL, delete (bus-only; do not inject `IDocumentRepository` from other modules)
- `DownloadDocumentQuery` for sibling modules

## Usage

```ts
await this.dms.upload({
  buffer,
  fileName: 'receipt.pdf',
  contentType: 'application/pdf',
  mappings: [{ entityType: 'donation', entityId }],
  visibility: 'internal',
  userId: user.userId,
  userPermissions,
});
```

OAuth-backed storage should obtain tokens through `OAUTH_ACCESS_TOKEN_PORT` (token vault), not by importing vault repositories.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-dms
```

Overview: [root README](../../../README.md).
