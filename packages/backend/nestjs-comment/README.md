# `@ssdev-toolkit/nestjs-comment`

Comments and @-mentions attached to host entity types. HTTP API plus mention notification port.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-comment
```

The host registers `ICommentRepository` and should provide `ICommentEntityAccessPort` so comments are restricted by record-level access. Optional `COMMENT_NOTIFICATION_PORT` for mention / “comment added” outbound notices.

## What it does

- `CommentModule.forRoot`
- CRUD + thread parent checks
- Mention events (`CommentMentionEvent`)
- Allowed entity types via `CommentModuleOptions`

Without `ICommentEntityAccessPort`, any authenticated user with the comment permission can act on any `entityType` / `entityId` — the module logs a startup warning.

## Usage

```ts
CommentModule.forRoot({
  allowedEntityTypes: [{ entityType: 'donation', /* permissions */ }],
});
```

Integrate with correspondence by implementing `ICommentNotificationPort` in the host.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-comment
```

Overview: [root README](../../../README.md).
