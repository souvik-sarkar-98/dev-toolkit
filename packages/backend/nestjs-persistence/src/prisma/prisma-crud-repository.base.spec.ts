import { BaseFilter } from '@ssdev-toolkit/nestjs-core';
import type { AuditedDatabaseClient } from '@ssdev-toolkit/nestjs-persistence/prisma/audited-database-client.interface';
import type { PrismaClientLike } from '@ssdev-toolkit/nestjs-persistence/prisma/base-prisma.service';
import { PrismaCrudRepositoryBase } from '@ssdev-toolkit/nestjs-persistence/prisma/prisma-crud-repository.base';

interface TestRow {
  id: string;
  name: string;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TestEntity {
  id: string;
  name: string;
  version: number;
}

interface TestFilter {
  name?: string;
}

type TestClient = PrismaClientLike & {
  testModel: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

function makeRow(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: 'id-1',
    name: 'alpha',
    deletedAt: null,
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

class TestRepository extends PrismaCrudRepositoryBase<
  TestClient,
  'testModel',
  TestEntity,
  string,
  TestFilter,
  TestRow,
  any, // TWhereInput
  any, // TWhereUniqueInput
  any, // TCreateInput
  any, // TUpdateInput
  any  // TOrderBy
// TInclude omitted — uses default Record<string, boolean | object>
> {
  constructor(database: AuditedDatabaseClient<TestClient>) {
    super(database, 'testModel');
  }

  protected toDomain(row: TestRow): TestEntity {
    return { id: row.id, name: row.name, version: row.version };
  }

  protected toCreateInput(entity: TestEntity) {
    return { name: entity.name };
  }

  protected toUpdateInput(_id: string, entity: TestEntity) {
    return { name: entity.name, version: entity.version };
  }

  protected toUniqueWhere(id: string) {
    return { id };
  }

  protected toFilterWhere(filter?: TestFilter) {
    return filter?.name ? { name: filter.name } : {};
  }
}

class SoftDeleteRepository extends TestRepository {
  protected supportsSoftDelete(): boolean {
    return true;
  }
}

class OptimisticLockRepository extends TestRepository {
  protected useOptimisticLocking(): boolean {
    return true;
  }

  protected toOptimisticLockWhere(_id: string, entity: TestEntity) {
    return { version: entity.version };
  }
}

class AuditFieldsRepository extends TestRepository {
  protected useAuditFields(): boolean {
    return true;
  }
}

class CustomDefaultPageSizeRepository extends TestRepository {
  protected defaultPageSize(): number {
    return 25;
  }
}

function buildRepository<T extends TestRepository>(
  RepoClass: new (db: AuditedDatabaseClient<TestClient>) => T,
) {
  const delegate = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const client = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $extends: jest.fn(),
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({ testModel: delegate }),
    ),
    testModel: delegate,
  } as unknown as TestClient;

  const database: AuditedDatabaseClient<TestClient> = { client };
  const repo = new RepoClass(database);
  return { repo, delegate };
}

describe('PrismaCrudRepositoryBase', () => {
  it('findById calls findUnique with mapped where', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.findUnique.mockResolvedValue(makeRow());

    const result = await repo.findById('id-1');

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    expect(result).toEqual({ id: 'id-1', name: 'alpha', version: 1 });
  });

  it('findById returns null when row is missing', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.findUnique.mockResolvedValue(null);

    await expect(repo.findById('missing')).resolves.toBeNull();
  });

  it('findAll calls findMany with filter where', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.findMany.mockResolvedValue([makeRow()]);

    const rows = await repo.findAll({ name: 'alpha' });

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { name: 'alpha' },
    });
    expect(rows).toHaveLength(1);
  });

  it('findPaged runs parallel findMany and count', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.findMany.mockResolvedValue([makeRow()]);
    delegate.count.mockResolvedValue(1);

    const page = await repo.findPaged(
      new BaseFilter<TestFilter>({ name: 'alpha' }, 0, 10),
    );

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { name: 'alpha' },
      take: 10,
      skip: 0,
    });
    expect(delegate.count).toHaveBeenCalledWith({ where: { name: 'alpha' } });
    expect(page.totalSize).toBe(1);
    expect(page.pageSize).toBe(10);
    expect(page.content).toHaveLength(1);
  });

  it('findPaged uses default page size 1000 when pageSize is omitted', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.findMany.mockResolvedValue([makeRow()]);
    delegate.count.mockResolvedValue(1);

    const page = await repo.findPaged(
      new BaseFilter<TestFilter>({ name: 'alpha' }),
    );

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { name: 'alpha' },
      take: 1000,
      skip: 0,
    });
    expect(page.pageSize).toBe(1000);
  });

  it('findPaged uses overridden defaultPageSize when pageSize is omitted', async () => {
    const { repo, delegate } = buildRepository(CustomDefaultPageSizeRepository);
    delegate.findMany.mockResolvedValue([makeRow()]);
    delegate.count.mockResolvedValue(1);

    const page = await repo.findPaged(
      new BaseFilter<TestFilter>({ name: 'alpha' }),
    );

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { name: 'alpha' },
      take: 25,
      skip: 0,
    });
    expect(page.pageSize).toBe(25);
  });

  it('findPaged uses explicit filter pageSize over defaultPageSize', async () => {
    const { repo, delegate } = buildRepository(CustomDefaultPageSizeRepository);
    delegate.findMany.mockResolvedValue([makeRow()]);
    delegate.count.mockResolvedValue(1);

    const page = await repo.findPaged(
      new BaseFilter<TestFilter>({ name: 'alpha' }, 1, 10),
    );

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { name: 'alpha' },
      take: 10,
      skip: 10,
    });
    expect(page.pageIndex).toBe(1);
    expect(page.pageSize).toBe(10);
  });

  it('count delegates to model count', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.count.mockResolvedValue(3);

    await expect(repo.count({ name: 'alpha' })).resolves.toBe(3);
    expect(delegate.count).toHaveBeenCalledWith({ where: { name: 'alpha' } });
  });

  it('create calls delegate.create with mapped data', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.create.mockResolvedValue(makeRow({ name: 'beta' }));

    const created = await repo.create({ id: 'id-2', name: 'beta', version: 1 });

    expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'beta' } });
    expect(created.name).toBe('beta');
  });

  it('create merges audit fields when enabled', async () => {
    const { repo, delegate } = buildRepository(AuditFieldsRepository);
    delegate.create.mockResolvedValue(makeRow());

    await repo.create({ id: 'id-1', name: 'alpha', version: 1 });

    const createArg = delegate.create.mock.calls[0][0];
    expect(createArg.data).toMatchObject({
      name: 'alpha',
      version: 1,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('update calls delegate.update with mapped data', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.update.mockResolvedValue(makeRow({ name: 'gamma' }));

    const updated = await repo.update('id-1', {
      id: 'id-1',
      name: 'gamma',
      version: 2,
    });

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: { name: 'gamma', version: 2 },
    });
    expect(updated.name).toBe('gamma');
  });

  it('update merges optimistic lock fields into where when enabled', async () => {
    const { repo, delegate } = buildRepository(OptimisticLockRepository);
    delegate.update.mockResolvedValue(makeRow());

    await repo.update('id-1', { id: 'id-1', name: 'alpha', version: 2 });

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 'id-1', version: 2 },
      data: { name: 'alpha', version: 2 },
    });
  });

  it('delete calls delegate.delete for hard delete', async () => {
    const { repo, delegate } = buildRepository(TestRepository);
    delegate.delete.mockResolvedValue(makeRow());

    await repo.delete('id-1');

    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: 'id-1' } });
    expect(delegate.update).not.toHaveBeenCalled();
  });

  it('delete calls delegate.update for soft delete', async () => {
    const { repo, delegate } = buildRepository(SoftDeleteRepository);
    delegate.update.mockResolvedValue(makeRow({ deletedAt: new Date() }));

    await repo.delete('id-1');

    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: 'id-1' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    });
    expect(delegate.delete).not.toHaveBeenCalled();
  });

  it('findById uses findFirst with deletedAt filter when soft delete enabled', async () => {
    const { repo, delegate } = buildRepository(SoftDeleteRepository);
    delegate.findFirst.mockResolvedValue(makeRow());

    await repo.findById('id-1');

    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: { id: 'id-1', deletedAt: null },
    });
    expect(delegate.findUnique).not.toHaveBeenCalled();
  });

  it('findAll adds non-deleted filter when soft delete enabled', async () => {
    const { repo, delegate } = buildRepository(SoftDeleteRepository);
    delegate.findMany.mockResolvedValue([]);

    await repo.findAll();

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });
});
