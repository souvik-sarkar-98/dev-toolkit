import type { AuditedDatabaseClient } from "./audited-database-client.interface";
import type { PrismaClientLike } from "./base-prisma.service";
import type {
  PrismaModelDelegate,
  PrismaModelKey,
} from "./prisma-type.utils";

/**
 * Thin foundation for Prisma-backed repositories. Provides typed access to the
 * audited client and a single model delegate.
 *
 * Prefer {@link PrismaCrudRepositoryBase} when implementing standard CRUD.
 */
export abstract class PrismaRepositoryBase<
  TClient extends PrismaClientLike,
  TDelegateKey extends PrismaModelKey<TClient>,
> {
  protected constructor(
    protected readonly database: AuditedDatabaseClient<TClient>,
    protected readonly delegateKey: TDelegateKey,
  ) {}

  /** Audited (possibly extended) Prisma client. */
  protected get client(): TClient {
    return this.database.client;
  }

  /** Typed delegate for this repository's model. */
  protected get delegate(): PrismaModelDelegate<TClient, TDelegateKey> {
    return this.client[this.delegateKey];
  }

  /** Run operations in a transaction on the audited client. */
  protected $transaction<R>(fn: (tx: TClient) => Promise<R>): Promise<R> {
    return this.client.$transaction((tx) => fn(tx as TClient));
  }
}
