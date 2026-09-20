import type { PrismaClientLike } from "./base-prisma.service";

/**
 * Minimal model delegate when a generated Prisma client is unavailable.
 * Use {@link PrismaClientForModel} to attach one delegate to {@link PrismaClientLike}.
 */
export type ModelDelegateForRow<TRow> = {
  findMany: (args?: unknown) => Promise<TRow[]>;
  findUnique: (args: unknown) => Promise<TRow | null>;
  findFirst?: (args: unknown) => Promise<TRow | null>;
  count: (args?: unknown) => Promise<number>;
  create: (args: unknown) => Promise<TRow>;
  update: (args: unknown) => Promise<TRow>;
  updateMany?: (args: unknown) => Promise<{ count: number }>;
  delete: (args: unknown) => Promise<TRow>;
  deleteMany?: (args: unknown) => Promise<{ count: number }>;
  upsert?: (args: unknown) => Promise<TRow>;
  createMany?: (args: unknown) => Promise<{ count: number }>;
};

/**
 * {@link PrismaClientLike} with a single typed model delegate — for library repos
 * that do not import the consumer's generated `PrismaClient`.
 *
 * @example
 * type Client = PrismaClientForModel<'authApiKey', AuthApiKeyRow>;
 * class ApiKeyRepository extends PrismaCrudRepositoryBase<Client, 'authApiKey', ...> {}
 */
export type PrismaClientForModel<
  TKey extends string,
  TRow,
> = PrismaClientLike & Record<TKey, ModelDelegateForRow<TRow>>;

/** Keys on a PrismaClient that are model delegates (camelCase accessors). */
export type PrismaModelKey<TClient> = {
  [K in keyof TClient]: K extends `$${string}`
    ? never
    : K extends symbol
      ? never
      : TClient[K] extends { findMany: (...args: never[]) => unknown }
        ? K
        : never;
}[keyof TClient];

/** The typed delegate for a model key, e.g. `TClient['role']`. */
export type PrismaModelDelegate<
  TClient,
  TKey extends PrismaModelKey<TClient>,
> = TClient[TKey];

type DelegateWithFindMany = { findMany: (...args: never[]) => unknown };
type DelegateWithFindUnique = { findUnique: (...args: never[]) => unknown };
type DelegateWithFindFirst = { findFirst: (...args: never[]) => unknown };
type DelegateWithCreate = { create: (...args: never[]) => unknown };
type DelegateWithUpdate = { update: (...args: never[]) => unknown };
type DelegateWithDelete = { delete: (...args: never[]) => unknown };
type DelegateWithCount = { count: (...args: never[]) => unknown };

/** Args accepted by `delegate.findMany`. */
export type DelegateFindManyArgs<D> = D extends DelegateWithFindMany
  ? Parameters<D["findMany"]>[0]
  : never;

/** Args accepted by `delegate.findUnique`. */
export type DelegateFindUniqueArgs<D> = D extends DelegateWithFindUnique
  ? Parameters<D["findUnique"]>[0]
  : never;

/** Args accepted by `delegate.findFirst`. */
export type DelegateFindFirstArgs<D> = D extends DelegateWithFindFirst
  ? Parameters<D["findFirst"]>[0]
  : never;

/** Args accepted by `delegate.create`. */
export type DelegateCreateArgs<D> = D extends DelegateWithCreate
  ? Parameters<D["create"]>[0]
  : never;

/** Args accepted by `delegate.update`. */
export type DelegateUpdateArgs<D> = D extends DelegateWithUpdate
  ? Parameters<D["update"]>[0]
  : never;

/** Args accepted by `delegate.delete`. */
export type DelegateDeleteArgs<D> = D extends DelegateWithDelete
  ? Parameters<D["delete"]>[0]
  : never;

/** Args accepted by `delegate.count`. */
export type DelegateCountArgs<D> = D extends DelegateWithCount
  ? Parameters<D["count"]>[0]
  : never;

/** `where` clause shape inferred from `findMany` args. */
export type DelegateWhereInput<D> = NonNullable<
  DelegateFindManyArgs<D> extends { where?: infer W } ? W : never
>;

/** `where` clause shape inferred from `findUnique` args. */
export type DelegateWhereUniqueInput<D> = NonNullable<
  DelegateFindUniqueArgs<D> extends { where?: infer W } ? W : never
>;

/** `data` shape inferred from `create` args. */
export type DelegateCreateInput<D> = DelegateCreateArgs<D> extends {
  data: infer Data;
}
  ? Data
  : never;

/** `data` shape inferred from `update` args. */
export type DelegateUpdateInput<D> = DelegateUpdateArgs<D> extends {
  data: infer Data;
}
  ? Data
  : never;

/** `orderBy` shape inferred from `findMany` args. */
export type DelegateOrderBy<D> = NonNullable<
  DelegateFindManyArgs<D> extends { orderBy?: infer O } ? O : never
>;

/** Row shape returned by `findUnique` (nullable). */
export type DelegateFindUniqueResult<D> = D extends DelegateWithFindUnique
  ? Awaited<ReturnType<D["findUnique"]>>
  : never;

/** Row shape returned by `findMany` (array element). */
export type DelegateFindManyRow<D> = D extends DelegateWithFindMany
  ? Awaited<ReturnType<D["findMany"]>> extends (infer R)[]
    ? R
    : never
  : never;

/**
 * Bundled delegate types for a model key — useful as a consumer-side alias.
 *
 * @example
 * type RoleTypes = PrismaDelegateTypes<PrismaClient, 'role'>;
 * type RoleWhere = RoleTypes['WhereInput'];
 */
export type PrismaDelegateTypes<
  TClient extends PrismaClientLike,
  TKey extends PrismaModelKey<TClient>,
> = {
  Delegate: PrismaModelDelegate<TClient, TKey>;
  WhereInput: DelegateWhereInput<PrismaModelDelegate<TClient, TKey>>;
  WhereUniqueInput: DelegateWhereUniqueInput<PrismaModelDelegate<TClient, TKey>>;
  CreateInput: DelegateCreateInput<PrismaModelDelegate<TClient, TKey>>;
  UpdateInput: DelegateUpdateInput<PrismaModelDelegate<TClient, TKey>>;
  OrderBy: DelegateOrderBy<PrismaModelDelegate<TClient, TKey>>;
  Row: NonNullable<DelegateFindUniqueResult<PrismaModelDelegate<TClient, TKey>>>;
};
