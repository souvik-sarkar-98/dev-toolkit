import { createAuditExtension } from '@ssdev-toolkit/nestjs-persistence/prisma/extensions/prisma-audit.extension';

describe('createAuditExtension', () => {
  function buildExtension(
    clientOverrides: Record<string, any> = {},
    extensionOptions: { auditCaptureOldValuesModels?: string[]; failOnError?: boolean } = {},
  ) {
    const auditCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const client = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Old' }),
      },
      auditEntityChangeLog: {
        create: auditCreate,
      },
      auditLog: {
        create: auditCreate,
      },
      $extends: jest.fn((extension) => extension),
      ...clientOverrides,
    };

    return {
      client,
      auditCreate,
      extension: createAuditExtension(['User'], extensionOptions)(client),
    };
  }

  it('does not capture old values on update by default', async () => {
    const { client, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'user-1', name: 'New' });

    await extension.query.$allModels.update({
      model: 'User',
      args: { where: { id: 'user-1' }, data: { name: 'New' } },
      query,
    });

    expect(client.user.findUnique).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'User',
        entityId: 'user-1',
        action: 'UPDATE',
        oldValues: {},
        newValues: { name: 'New' },
      }),
    });
  });

  it('captures old values on update when model is in auditCaptureOldValuesModels', async () => {
    const { client, extension } = buildExtension(
      {},
      { auditCaptureOldValuesModels: ['User'] },
    );
    const query = jest.fn().mockResolvedValue({ id: 'user-1', name: 'New' });

    await extension.query.$allModels.update({
      model: 'User',
      args: { where: { id: 'user-1' }, data: { name: 'New' } },
      query,
    });

    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, name: true },
    });
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'User',
        entityId: 'user-1',
        action: 'UPDATE',
        oldValues: { id: 'user-1', name: 'Old' },
        newValues: { name: 'New' },
      }),
    });
  });

  it('uses pre-existing row to classify upsert audits', async () => {
    const { client, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'user-1', name: 'New' });

    await extension.query.$allModels.upsert({
      model: 'User',
      args: {
        where: { id: 'user-1' },
        create: { name: 'Created' },
        update: { name: 'New' },
      },
      query,
    });

    expect(client.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, name: true },
    });
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'UPDATE',
        oldValues: { id: 'user-1', name: 'Old' },
        newValues: { name: 'New' },
      }),
    });
  });

  it('logs a single audit row for updateMany bulk operations', async () => {
    const { client, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ count: 5 });

    await extension.query.$allModels.updateMany({
      model: 'User',
      args: {
        where: { status: 'inactive' },
        data: { status: 'active' },
      },
      query,
    });

    expect(client.user.findUnique).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledTimes(1);
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'User',
        entityId: 'bulk',
        action: 'UPDATE_MANY',
        oldValues: { where: { status: 'inactive' } },
        newValues: { data: { status: 'active' }, count: 5 },
      }),
    });
  });

  it('logs a single audit row for deleteMany bulk operations', async () => {
    const { client, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ count: 3 });

    await extension.query.$allModels.deleteMany({
      model: 'User',
      args: { where: { status: 'inactive' } },
      query,
    });

    expect(client.user.findUnique).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledTimes(1);
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'User',
        entityId: 'bulk',
        action: 'DELETE_MANY',
        oldValues: { where: { status: 'inactive' } },
        newValues: { count: 3 },
      }),
    });
  });

  it('uses delete result as old values without pre-fetching', async () => {
    const { client, extension } = buildExtension();
    const deletedRow = { id: 'user-1', name: 'Deleted User', email: 'u@example.com' };
    const query = jest.fn().mockResolvedValue(deletedRow);

    const result = await extension.query.$allModels.delete({
      model: 'User',
      args: { where: { id: 'user-1' } },
      query,
    });

    expect(result).toEqual(deletedRow);
    expect(query).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(client.user.findUnique).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'User',
        entityId: 'user-1',
        action: 'DELETE',
        oldValues: deletedRow,
        newValues: {},
      }),
    });
  });

  it('skips audit logging for delete on non-audited models', async () => {
    const { client, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'post-1' });

    await extension.query.$allModels.delete({
      model: 'Post',
      args: { where: { id: 'post-1' } },
      query,
    });

    expect(client.user.findUnique).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).not.toHaveBeenCalled();
  });

  it('skips audit logging when creating AuditEntityChangeLog records', async () => {
    const { client, extension, auditCreate } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'audit-1' });

    await extension.query.$allModels.create({
      model: 'AuditEntityChangeLog',
      args: {
        data: {
          entityType: 'User',
          entityId: 'user-1',
          action: 'CREATE',
          userId: 'system',
          userName: 'System',
        },
      },
      query,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(auditCreate).not.toHaveBeenCalled();
    expect(client.auditEntityChangeLog.create).not.toHaveBeenCalled();
  });

  it('skips audit logging when deleting AuditEntityChangeLog records', async () => {
    const { auditCreate, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'audit-1' });

    await extension.query.$allModels.delete({
      model: 'AuditEntityChangeLog',
      args: { where: { id: 'audit-1' } },
      query,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('skips audit logging when deleting legacy AuditLog records', async () => {
    const { auditCreate, extension } = buildExtension();
    const query = jest.fn().mockResolvedValue({ id: 'audit-1' });

    await extension.query.$allModels.delete({
      model: 'AuditLog',
      args: { where: { id: 'audit-1' } },
      query,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('throws audit failures when failOnError is enabled', async () => {
    const client = {
      auditEntityChangeLog: {
        create: jest.fn().mockRejectedValue(new Error('audit unavailable')),
      },
      $extends: jest.fn((extension) => extension),
    };
    const extension = createAuditExtension(['User'], { failOnError: true })(client);
    const query = jest.fn().mockResolvedValue({ id: 'user-1' });

    await expect(
      extension.query.$allModels.create({
        model: 'User',
        args: { data: { name: 'New' } },
        query,
      }),
    ).rejects.toThrow('audit unavailable');
  });
});
