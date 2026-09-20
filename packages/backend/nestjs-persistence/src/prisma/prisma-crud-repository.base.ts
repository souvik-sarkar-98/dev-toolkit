import { BaseFilter, SortOrder } from "@ssdev-toolkit/nestjs-core";
import { Page } from "@ssdev-toolkit/nestjs-core";
import type { IRepository } from "@ssdev-toolkit/nestjs-core";
import type { PrismaClientLike } from "./base-prisma.service";
import { PrismaRepositoryBase } from "./prisma-repository.base";
import type {
  DelegateFindManyRow,
  PrismaModelDelegate,
  PrismaModelKey,
} from "./prisma-type.utils";
import { RepositoryHelpers } from "./repository-helpers";

type Delegate<
  TClient extends PrismaClientLike,
  TDelegateKey extends PrismaModelKey<TClient>,
> = PrismaModelDelegate<TClient, TDelegateKey>;

/**
 * Fully-typed abstract CRUD repository backed by a single Prisma model delegate.
 * Implements {@link IRepository} with Prisma input types supplied explicitly by
 * the consumer's concrete subclass.
 *
 * All eleven type parameters from `TRow` onwards are **required**. Pass the
 * Prisma-generated `XxxWhereInput`, `XxxWhereUniqueInput`, `XxxCreateInput`,
 * `XxxUpdateInput`, and `XxxOrderByWithRelationInput` types directly. The optional
 * twelfth parameter `TInclude` defaults to `Record<string, boolean | object>` and
 * should be specified only when the repository needs to eager-load relations.
 *
 * @example
 * export class RoleRepository extends PrismaCrudRepositoryBase<
 *   PrismaClient, 'authRole', Role, string, RoleFilter,
 *   RoleRow,
 *   AuthRoleWhereInput,
 *   AuthRoleWhereUniqueInput,
 *   ({} & AuthRoleCreateInput) | ({} & AuthRoleUncheckedCreateInput),
 *   ({} & AuthRoleUpdateInput) | ({} & AuthRoleUncheckedUpdateInput),
 *   AuthRoleOrderByWithRelationInput
 * > {
 *   constructor(database: BasePrismaService<PrismaClient>) {
 *     super(database, 'authRole');
 *   }
 *   // implement abstract mapping hooks …
 * }
 */
export abstract class PrismaCrudRepositoryBase<
  TClient extends PrismaClientLike,
  TDelegateKey extends PrismaModelKey<TClient>,
  TEntity,
  TId,
  TFilter,
  TRow extends DelegateFindManyRow<Delegate<TClient, TDelegateKey>>,
  TWhereInput,
  TWhereUniqueInput,
  TCreateInput,
  TUpdateInput,
  TOrderBy,
  TInclude = Record<string, boolean | object>,
> extends PrismaRepositoryBase<TClient, TDelegateKey>
  implements IRepository<TEntity, TId, TFilter> {
  async findById(id: TId, include?: TInclude): Promise<TEntity | null> {
    const resolvedInclude = include ?? this.toInclude();
    const delegate = this.delegate as {
      findUnique: (args: { where: TWhereUniqueInput; include?: TInclude }) => Promise<TRow | null>;
      findFirst?: (args: { where: TWhereInput; include?: TInclude }) => Promise<TRow | null>;
    };

    if (this.supportsSoftDelete() && delegate.findFirst) {
      const where = RepositoryHelpers.addNonDeletedFilter(
        this.toUniqueWhere(id) as { deletedAt?: Date | null },
      ) as unknown as TWhereInput;
      const row = await delegate.findFirst({
        where,
        ...(resolvedInclude !== undefined ? { include: resolvedInclude } : {}),
      });
      return row ? this.toDomain(row) : null;
    }

    const row = await delegate.findUnique({
      where: this.toUniqueWhere(id),
      ...(resolvedInclude !== undefined ? { include: resolvedInclude } : {}),
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(filter?: TFilter, include?: TInclude): Promise<TEntity[]> {
    const where = this.buildListWhere(filter);
    const orderBy = this.defaultOrderBy();
    const resolvedInclude = include ?? this.toInclude();
    const rows = await (this.delegate as {
      findMany: (args: {
        where?: TWhereInput;
        orderBy?: TOrderBy;
        include?: TInclude;
      }) => Promise<TRow[]>;
    }).findMany({
      where,
      ...(orderBy !== undefined ? { orderBy } : {}),
      ...(resolvedInclude !== undefined ? { include: resolvedInclude } : {}),
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findPaged(filter?: BaseFilter<TFilter>, include?: TInclude): Promise<Page<TEntity>> {
    const where = this.buildListWhere(filter?.props);
    // Resolve effective values before building pagination so the query `take`
    // and the returned `Page` metadata always agree, even when pageSize is omitted.
    const pageIndex = filter?.pageIndex ?? 0;
    const pageSize = filter?.pageSize ?? this.defaultPageSize();
    // Dynamic sort from filter takes precedence; fall back to the static hook.
    const orderBy = filter?.sortBy
      ? ({ [filter.sortBy]: filter.sortDir ?? SortOrder.ASC } as TOrderBy)
      : this.defaultOrderBy();
    const pagination = RepositoryHelpers.buildPaginationOptions(pageIndex, pageSize);
    const resolvedInclude = include ?? this.toInclude();

    const delegate = this.delegate as {
      findMany: (args: {
        where?: TWhereInput;
        orderBy?: TOrderBy;
        include?: TInclude;
        skip?: number;
        take?: number;
      }) => Promise<TRow[]>;
      count: (args: {
        where?: TWhereInput;
      }) => Promise<number>;
    };

    const [rows, total] = await Promise.all([
      delegate.findMany({
        where,
        ...pagination,
        ...(orderBy !== undefined ? { orderBy } : {}),
        ...(resolvedInclude !== undefined ? { include: resolvedInclude } : {}),
      }),
      delegate.count({ where }),
    ]);

    return new Page(
      rows.map((row) => this.toDomain(row)),
      total,
      pageIndex,
      pageSize,
    );
  }

  async count(filter: TFilter): Promise<number> {
    const where = this.buildListWhere(filter);
    return (this.delegate as {
      count: (args: {
        where?: TWhereInput;
      }) => Promise<number>;
    }).count({ where });
  }

  async create(entity: TEntity): Promise<TEntity> {
    let data = this.toCreateInput(entity) as Record<string, unknown>;
    if (this.useAuditFields()) {
      data = { ...data, ...RepositoryHelpers.buildCreateAuditFields() };
    }
    const row = await (this.delegate as {
      create: (args: {
        data: TCreateInput;
      }) => Promise<TRow>;
    }).create({ data: data as TCreateInput });
    const saved = this.toDomain(row);
    return saved;
  }

  async update(id: TId, entity: TEntity): Promise<TEntity> {
    let data = this.toUpdateInput(id, entity) as Record<string, unknown>;
    if (this.useAuditFields()) {
      const version =
        typeof data.version === "number" ? (data.version as number) : 0;
      data = { ...data, ...RepositoryHelpers.buildUpdateAuditFields(version) };
    }

    let where = this.toUniqueWhere(id) as Record<string, unknown>;
    const optimisticLock = this.toOptimisticLockWhere(id, entity);
    if (this.useOptimisticLocking() && optimisticLock) {
      where = { ...where, ...optimisticLock };
    }

    const row = await (this.delegate as {
      update: (args: {
        where: TWhereUniqueInput;
        data: TUpdateInput;
      }) => Promise<TRow>;
    }).update({
      where: where as TWhereUniqueInput,
      data: data as TUpdateInput,
    });
    const saved = this.toDomain(row);
    return saved;
  }

  async delete(id: TId): Promise<void> {
    const where = this.toUniqueWhere(id);

    if (this.supportsSoftDelete()) {
      await (this.delegate as {
        update: (args: {
          where: TWhereUniqueInput;
          data: Record<string, unknown>;
        }) => Promise<unknown>;
      }).update({
        where,
        data: RepositoryHelpers.buildSoftDeleteData(),
      });
      return;
    }

    await (this.delegate as {
      delete: (args: {
        where: TWhereUniqueInput;
      }) => Promise<unknown>;
    }).delete({ where });
  }

  /** Map a Prisma row to the domain entity. */
  protected abstract toDomain(row: TRow): TEntity;

  /** Map a domain entity to Prisma create input. */
  protected abstract toCreateInput(entity: TEntity): TCreateInput;

  /** Map a domain entity to Prisma update input. */
  protected abstract toUpdateInput(id: TId, entity: TEntity): TUpdateInput;

  /** Build a unique `where` clause for find/update/delete by id. */
  protected abstract toUniqueWhere(id: TId): TWhereUniqueInput;

  /** Build a filter `where` clause for list/count queries. */
  protected abstract toFilterWhere(filter?: TFilter): TWhereInput;

  /**
   * When `useOptimisticLocking()` is true, return extra `where` fields (e.g.
   * `{ version: entity.version }`). Default: no extra fields.
   */
  protected toOptimisticLockWhere(
    _id: TId,
    _entity: TEntity,
  ): Partial<TWhereUniqueInput> | undefined {
    return undefined;
  }

  /** When true, non-deleted rows are filtered and delete performs a soft delete. */
  protected supportsSoftDelete(): boolean {
    return false;
  }

  /** When true, create/update merge standard audit timestamp/version fields. */
  protected useAuditFields(): boolean {
    return false;
  }

  /** When true, update merges {@link toOptimisticLockWhere} into the where clause. */
  protected useOptimisticLocking(): boolean {
    return false;
  }

  /** Default sort for list/paged queries. */
  protected defaultOrderBy(): TOrderBy | undefined {
    return undefined;
  }

  /**
   * Default page size when `findPaged` is called without `filter.pageSize`.
   * Override in a concrete repository to change the unbounded-list default
   * without repeating it in every paged query.
   */
  protected defaultPageSize(): number {
    return 1000;
  }

  /**
   * Default `include` applied to all find queries (`findById`, `findAll`,
   * `findPaged`, `findFirst`). Override to always eager-load a relation without
   * having to override every individual find method.
   *
   * The per-call `include?` parameter on each find method takes precedence over
   * this hook when both are provided.
   */
  protected toInclude(): TInclude | undefined {
    return undefined;
  }

  /**
   * Return the first entity matching the filter, or null if none match.
   * Soft-delete filtering is applied automatically when supportsSoftDelete() is true.
   * Supply an optional orderBy to control which row is returned when multiple match.
   * Supply an optional include to eager-load relations for this call only.
   *
   * Use this inside custom repository methods where a single result is needed.
   * The default `toInclude()` hook is applied when `include` is not passed.
   */
  protected async findFirst(
    filter?: TFilter,
    orderBy?: TOrderBy,
    include?: TInclude,
  ): Promise<TEntity | null> {
    const where = this.buildListWhere(filter);
    const resolvedInclude = include ?? this.toInclude();
    const row = await (this.delegate as {
      findFirst?: (args: {
        where?: TWhereInput;
        orderBy?: TOrderBy;
        include?: TInclude;
      }) => Promise<TRow | null>;
    }).findFirst?.({
      where,
      ...(orderBy !== undefined ? { orderBy } : {}),
      ...(resolvedInclude !== undefined ? { include: resolvedInclude } : {}),
    }) ?? null;
    return row ? this.toDomain(row) : null;
  }

  private buildListWhere(filter?: TFilter): TWhereInput {
    const baseWhere = this.toFilterWhere(filter);
    if (!this.supportsSoftDelete()) {
      return baseWhere;
    }
    return RepositoryHelpers.addNonDeletedFilter(
      baseWhere as { deletedAt?: Date | null },
    ) as unknown as TWhereInput;
  }
}
