# Shared packages

NestJS libraries for API hosts. Most modules follow DDD layers (domain → application → infrastructure → presentation). The **host application** supplies Prisma adapters, IdP/HTTP edge wiring, and third-party credentials.

| Package | Role |
|---------|------|
| [`@ssdev-toolkit/nestjs-core`](nestjs-core/README.md) | Aggregates, errors, envelopes, bootstrap, `CoreModule` |
| [`@ssdev-toolkit/nestjs-persistence`](nestjs-persistence/README.md) | Prisma CRUD base, Redis cache, `DatabaseModule` |
| [`@ssdev-toolkit/nestjs-observability`](nestjs-observability/README.md) | Technical-error alerts (`ObservabilityModule`) |
| [`@ssdev-toolkit/nestjs-health`](nestjs-health/README.md) | Liveness / readiness / metrics probes |
| [`@ssdev-toolkit/nestjs-auth`](nestjs-auth/README.md) | JWT/API-key/RBAC guards, `AuthFacade` |
| [`@ssdev-toolkit/nestjs-queue`](nestjs-queue/README.md) | BullMQ jobs, `@QueueHandler`, `QueueFacade` |
| [`@ssdev-toolkit/nestjs-cron`](nestjs-cron/README.md) | Scheduled jobs over a queue/store port |
| [`@ssdev-toolkit/nestjs-token-vault`](nestjs-token-vault/README.md) | OAuth account/token vault, `TokenVaultFacade` |
| [`@ssdev-toolkit/nestjs-json-store`](nestjs-json-store/README.md) | Versioned JSON documents, `JsonStoreFacade` |
| [`@ssdev-toolkit/nestjs-custom-forms`](nestjs-custom-forms/README.md) | Form definitions and submissions, `CustomFormsFacade` |
| [`@ssdev-toolkit/nestjs-comment`](nestjs-comment/README.md) | Entity comments and mentions |
| [`@ssdev-toolkit/nestjs-correspondence`](nestjs-correspondence/README.md) | Email / in-app / push notifications |
| [`@ssdev-toolkit/nestjs-dms`](nestjs-dms/README.md) | Document storage (Firebase or host `IStorageProvider`), `DmsFacade` |
| [`@ssdev-toolkit/nestjs-document-generator`](nestjs-document-generator/README.md) | Excel / PDF generation |

Each package has its own `package.json` and builds to `dist/**`. Consumers install published versions from npm, or use workspace `"*"` ranges inside this monorepo.

```bash
npm run build   # turbo builds packages in dependency order (^build)
```

### Wiring rules (all feature packages)

- Import `XxxModule.forRoot()` / `forRootAsync()` once in the host.
- Implement repository **tokens** only in the host persistence module.
- Other bounded contexts use the package **facade** (or exported commands/queries on the bus). Do not inject foreign repositories.
- Reads of users from anywhere use `IUserLookupPort`. Writes to users belong in the host user module.

After changing a package, run `npm run changeset` from the repo root. Packages publish as public scoped packages to npmjs. See the root [README](../../README.md#package-versioning-changesets).
