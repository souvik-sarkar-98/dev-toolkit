import KeyvRedis from "@keyv/redis";
import { CacheModule } from "@nestjs/cache-manager";
import {
  DynamicModule,
  Logger,
  Module,
  Provider,
} from "@nestjs/common";
import {
  BaseDynamicModule,
  DynamicModuleAsyncOptions,
} from "@ssdev-toolkit/nestjs-core";
import { DatabaseOptionsSchema } from "./database.schema";
import { CacheService } from "./cache/cache.service";
import {
  BasePrismaService,
  PRISMA_CLIENT,
  PrismaClientLike,
} from "./prisma/base-prisma.service";
import {
  KEYV_REDIS_CLIENT,
  RedisLifecycleService,
} from "./redis/redis-lifecycle.service";
import { DATABASE_OPTIONS } from "./database-options.token";

export { DATABASE_OPTIONS };

export interface DatabaseModuleOptions<
  TClient extends PrismaClientLike = PrismaClientLike,
> {
  redisUrl: string;
  /**
   * Factory that returns the consuming project's generated PrismaClient instance.
   * The library uses this client to connect and applies the audit extension on top.
   *
   * Database selection (Postgres, MySQL, SQL Server, adapter wiring, connection
   * strings) is entirely the consumer's responsibility — pass a ready client here.
   *
   * The `TClient` generic is inferred from this factory's return type, so pass
   * your generated client here and the injected `BasePrismaService<TClient>`
   * (and its `.client`) stay fully typed downstream.
   *
   * @example
   * import { PrismaClient } from './generated/prisma/client';
   * import { PrismaPg } from '@prisma/adapter-pg';
   *
   * prismaClientFactory: () =>
   *   new PrismaClient({
   *     adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
   *   })
   */
  prismaClientFactory: () => TClient;
  auditedModels?: string[];
  /** When true, applies the Prisma audit extension to auditedModels. Default: false. */
  enableAuditExtension?: boolean;
  /** Models for which UPDATE audits include pre-fetched old values. Default: none. */
  auditCaptureOldValuesModels?: string[];
  failOnAuditError?: boolean;
  cacheStoreTtl?: number;
}

export interface DatabaseModuleAsyncOptions<
  TClient extends PrismaClientLike = PrismaClientLike,
> extends DynamicModuleAsyncOptions<DatabaseModuleOptions<TClient>> { }

/** Holds shared options/redis providers so CacheModule.registerAsync can import them. */
@Module({})
class DatabaseInfrastructureModule {
  static register(optionsProviders: Provider[]): DynamicModule {
    return {
      module: DatabaseInfrastructureModule,
      providers: [
        ...optionsProviders,
        {
          provide: KEYV_REDIS_CLIENT,
          useFactory: (opts: DatabaseModuleOptions) => {
            const store = new KeyvRedis(opts.redisUrl);
            store.on("error", (err: unknown) =>
              redisLogger.error(
                `KeyvRedis cache error: ${err instanceof Error ? err.message : String(err)
                }`,
              ),
            );
            return store;
          },
          inject: [DATABASE_OPTIONS],
        },
      ],
      exports: [DATABASE_OPTIONS, KEYV_REDIS_CLIENT],
    };
  }
}

const redisLogger = new Logger("KeyvRedisClient");

@Module({})
export class DatabaseModule extends BaseDynamicModule {
  static forRoot<TClient extends PrismaClientLike = PrismaClientLike>(
    options: DatabaseModuleOptions<TClient>,
  ): DynamicModule {
    const optionsProvider = DatabaseModule.createOptionsProvider(
      DATABASE_OPTIONS,
      DatabaseOptionsSchema,
      options,
    );
    const validated = DatabaseModule.validateOptions(
      DatabaseOptionsSchema,
      options,
    ) as DatabaseModuleOptions<TClient>;
    return DatabaseModule._build(
      [optionsProvider],
      [
        {
          provide: PRISMA_CLIENT,
          useFactory: () => validated.prismaClientFactory(),
        },
      ],
    );
  }

  static forRootAsync<TClient extends PrismaClientLike = PrismaClientLike>(
    options: DatabaseModuleAsyncOptions<TClient>,
  ): DynamicModule {
    return DatabaseModule._build(
      [
        {
          ...DatabaseModule.createAsyncOptionsProvider(
            DATABASE_OPTIONS,
            DatabaseOptionsSchema,
            options,
          ),
        },
      ],
      [
        {
          provide: PRISMA_CLIENT,
          useFactory: async (opts: DatabaseModuleOptions<TClient>) => {
            return opts.prismaClientFactory();
          },
          inject: [DATABASE_OPTIONS],
        },
      ],
      options.imports,
    );
  }

  private static _build(
    databaseOptionsProviders: Provider[],
    moduleProviders: Provider[] = [],
    extraImports: any[] = [],
  ): DynamicModule {
    const infrastructure = DatabaseInfrastructureModule.register(
      databaseOptionsProviders,
    );

    return {
      module: DatabaseModule,
      imports: [
        ...extraImports,
        infrastructure,
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [infrastructure],
          // Reuse the single managed KeyvRedis instance so its connection has a
          // lifecycle owner (closed on shutdown) and a single error listener.
          useFactory: async (
            _opts: DatabaseModuleOptions,
            keyvRedis: KeyvRedis,
          ) => ({
            ttl: _opts.cacheStoreTtl,
            stores: [keyvRedis],
          }),
          inject: [DATABASE_OPTIONS, KEYV_REDIS_CLIENT],
        }),
      ],
      providers: [
        ...moduleProviders,
        BasePrismaService,
        CacheService,
        RedisLifecycleService,
      ],
      global: true,
      exports: [
        infrastructure,
        BasePrismaService,
        CacheService,
      ],
    };
  }
}
