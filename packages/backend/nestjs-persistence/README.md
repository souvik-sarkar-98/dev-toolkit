# `@ssdev-toolkit/nestjs-persistence`

Prisma + Redis infrastructure: `DatabaseModule`, CRUD repository base, cache, locking port.

## Install

```bash
npm install @ssdev-toolkit/nestjs-core @ssdev-toolkit/nestjs-persistence
```

The host owns the generated Prisma client, connection string, and Redis URL.

## What it does

- `DatabaseModule.forRoot` / `forRootAsync` — wraps the host `PrismaClient`, Keyv Redis cache.
- `PrismaCrudRepositoryBase` — required base for standard CRUD adapters (`findPaged`, `create`, `update`, `delete`, `count` come from the base).
- `PrismaRepositoryBase` — custom / multi-model / `$queryRaw` adapters.
- `CacheService`, `@Cacheable`, `ILockingPort`, mapper helpers.

## Usage

```ts
DatabaseModule.forRootAsync({
  useFactory: () => ({
    redisUrl: process.env.REDIS_URL!,
    prismaClientFactory: () => new PrismaClient(),
  }),
});
```

```ts
@Injectable()
export class RolePrismaRepository extends PrismaCrudRepositoryBase<
  PrismaClient, 'authRole', Role, string, RoleFilter,
  RoleRow, AuthRoleWhereInput, AuthRoleWhereUniqueInput,
  AuthRoleCreateInput, AuthRoleUpdateInput, AuthRoleOrderByWithRelationInput
> implements IRoleRepository {
  constructor(database: BasePrismaService<PrismaClient>) {
    super(database, 'authRole'); // generated client key only
  }
}
```

Provide `{ provide: ICACHE_PORT, useExisting: CacheService }` so auth and other modules can cache.

## Build (this repo)

```bash
npm run build -w @ssdev-toolkit/nestjs-persistence
```

Overview: [root README](../../../README.md).
