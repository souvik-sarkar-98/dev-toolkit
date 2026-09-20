import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { DATABASE_OPTIONS } from "../database-options.token";
import type { DatabaseModuleOptions } from "../database.module";
import type { AuditedDatabaseClient } from "./audited-database-client.interface";

/** @internal Used only by {@link DatabaseModule} and {@link BasePrismaService} DI. Not part of the public API. */
export const PRISMA_CLIENT = Symbol("PRISMA_CLIENT");

/**
 * Minimal structural contract every generated PrismaClient satisfies. Used as the
 * generic constraint so the library can call lifecycle/extension methods without
 * knowing the consumer's concrete client type.
 */
export interface PrismaClientLike {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $extends(extension: unknown): unknown;
  $queryRaw<T>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  $transaction<R>(
    fn: (tx: unknown) => Promise<R>,
    options?: unknown,
  ): Promise<R>;
}

/**
 * Base Prisma service that wraps the consumer-provided PrismaClient instance.
 * The consumer passes their own generated client via DatabaseModule.forRoot({ prismaClientFactory }).
 *
 * Generic over the consumer's generated `PrismaClient` type. To preserve types,
 * inject it with your concrete client type and access models through `.client`:
 *
 * @example
 * import { PrismaClient } from './generated/prisma/client';
 * constructor(private readonly prisma: BasePrismaService<PrismaClient>) {}
 * this.prisma.client.user.findMany(); // fully typed
 *
 * The runtime Proxy also forwards model accessors from the instance itself
 * (e.g. `this.prisma.user`), but that path is intentionally untyped (`any`) via
 * the index signature so this library's own client-type-agnostic repositories
 * still compile. Prefer `.client` for type safety.
 */
@Injectable()
export class BasePrismaService<TClient extends PrismaClientLike = PrismaClientLike>
  implements
  AuditedDatabaseClient<TClient>,
  OnModuleInit,
  OnApplicationShutdown {

  /** Allows untyped model accessor forwarding via the runtime Proxy (e.g. `this.prisma.user`). */
  [key: string]: any;

  private readonly logger = new Logger(BasePrismaService.name);
  private _client: TClient;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly rawClient: TClient,
    @Inject(DATABASE_OPTIONS) private readonly options: DatabaseModuleOptions,
  ) {
    const auditEnabled = options?.enableAuditExtension === true;
    const auditedModels: string[] = options?.auditedModels ?? [];
    if (auditEnabled && auditedModels.length > 0) {
      const { createAuditExtension } = require("./extensions/prisma-audit.extension");
      this._client = rawClient.$extends(
        createAuditExtension(auditedModels, {
          failOnError: options?.failOnAuditError === true,
          auditCaptureOldValuesModels:
            options?.auditCaptureOldValuesModels ?? [],
        }),
      ) as TClient;
    } else {
      this._client = rawClient;
    }

    // Proxy all property accesses to the underlying (possibly extended) client
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const clientVal = (target)._client;
        if (clientVal && prop in clientVal) {
          const val = Reflect.get(clientVal, prop);
          return typeof val === "function" ? val.bind(clientVal) : val;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  get client(): TClient {
    return this._client;
  }

  async onModuleInit() {
    await this.rawClient.$connect();
    this.logger.log("Connected to Database");
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutdown: ${signal}`);
    await this.rawClient.$disconnect();
    this.logger.debug("Database disconnected");
  }

  async healthCheck(): Promise<boolean> {
    await this.rawClient.$queryRaw`SELECT 1`;
    return true;
  }
}
