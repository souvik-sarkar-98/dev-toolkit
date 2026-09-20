// ── Module & configuration ────────────────────────────────────────────────────
export { DatabaseModule, DATABASE_OPTIONS } from './database.module';
export type { DatabaseModuleOptions, DatabaseModuleAsyncOptions } from './database.module';
export { DatabaseOptionsSchema } from './database.schema';

// ── Prisma base classes ───────────────────────────────────────────────────────
export { BasePrismaService, PRISMA_CLIENT } from './prisma/base-prisma.service';
export type { PrismaClientLike } from './prisma/base-prisma.service';
export type { AuditedDatabaseClient } from './prisma/audited-database-client.interface';
export { PrismaRepositoryBase } from './prisma/prisma-repository.base';
export { PrismaCrudRepositoryBase } from './prisma/prisma-crud-repository.base';
export type {
  DelegateCountArgs,
  DelegateCreateArgs,
  DelegateCreateInput,
  DelegateDeleteArgs,
  DelegateFindFirstArgs,
  DelegateFindManyArgs,
  DelegateFindManyRow,
  DelegateFindUniqueArgs,
  DelegateFindUniqueResult,
  DelegateOrderBy,
  DelegateUpdateArgs,
  DelegateUpdateInput,
  DelegateWhereInput,
  DelegateWhereUniqueInput,
  ModelDelegateForRow,
  PrismaClientForModel,
  PrismaDelegateTypes,
  PrismaModelDelegate,
  PrismaModelKey,
} from './prisma/prisma-type.utils';
export { ILockingPort } from './domain/ports/locking.port';
export type { LockTransaction } from './domain/ports/locking.port';
export { RepositoryHelpers } from './prisma/repository-helpers';

// ── Redis services ────────────────────────────────────────────────────────────
export { KEYV_REDIS_CLIENT } from './redis/redis-lifecycle.service';

// ── Cache layer ───────────────────────────────────────────────────────────────
export { CacheService, getActiveCacheService } from './cache/cache.service';
export { Cacheable, Cacheble } from './cache/decorators/cacheable.decorator';
export type { CacheableOptions } from './cache/decorators/cacheable.decorator';

// ── Mapper utilities ──────────────────────────────────────────────────────────
export { CommonMappers } from './mappers/common-mappers';
export { MapperUtils } from './mappers/mapper-utils';
