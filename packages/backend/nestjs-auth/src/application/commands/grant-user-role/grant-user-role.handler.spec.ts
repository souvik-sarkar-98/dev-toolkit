import 'reflect-metadata';
import { GrantUserRoleHandler } from './grant-user-role.handler';
import { GrantUserRoleCommand } from './grant-user-role.command';
import { Role } from '../../../domain/aggregates/role/role.aggregate';
import { RoleNotFoundError } from '../../../domain/errors/auth.errors';

const makeUserRoleRepo = () => ({
  findById: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
  findActiveByIdPSub: jest.fn(),
  resolveDirectPermissions: jest.fn(),
  bulkCreate: jest.fn(),
  revokeSourcedRoles: jest.fn(),
  findIdPSubsByRoleKey: jest.fn(),
});

const makeRoleRepo = () => ({
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findPaged: jest.fn(),
  count: jest.fn(),
  findByKey: jest.fn(),
  findWithPermissions: jest.fn(),
  findWithPermissionsById: jest.fn(),
  syncPermissions: jest.fn(),
});

const makeEventBus = () => ({ publishAll: jest.fn() });

function makeRole(): Role {
  return new Role({ id: 'role-id-1', key: 'admin', createdAt: new Date() });
}

describe('GrantUserRoleHandler', () => {
  let userRoleRepo: ReturnType<typeof makeUserRoleRepo>;
  let roleRepo: ReturnType<typeof makeRoleRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: GrantUserRoleHandler;

  beforeEach(() => {
    userRoleRepo = makeUserRoleRepo();
    roleRepo = makeRoleRepo();
    eventBus = makeEventBus();
    handler = new GrantUserRoleHandler(userRoleRepo as any, roleRepo as any, eventBus as any);
  });

  it('grants a role, persists and returns the DTO', async () => {
    const role = makeRole();
    roleRepo.findByKey.mockResolvedValue(role);

    const result = await handler.execute(
      new GrantUserRoleCommand('user|abc', 'admin', undefined, 'admin|xyz'),
    );

    expect(roleRepo.findByKey).toHaveBeenCalledWith('admin');
    expect(userRoleRepo.create).toHaveBeenCalledTimes(1);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result.roleId).toBe('role-id-1');
    expect(result.idpSub).toBe('user|abc');
  });

  it('throws RoleNotFoundError when the role key does not exist', async () => {
    roleRepo.findByKey.mockResolvedValue(null);

    await expect(
      handler.execute(new GrantUserRoleCommand('user|abc', 'nonexistent', undefined, 'admin|xyz')),
    ).rejects.toThrow(RoleNotFoundError);
    expect(userRoleRepo.create).not.toHaveBeenCalled();
  });

  it('includes optional fields in the created UserRole', async () => {
    const role = makeRole();
    roleRepo.findByKey.mockResolvedValue(role);

    const result = await handler.execute(
      new GrantUserRoleCommand(
        'user|abc',
        'admin',
        'owner|111',
        'admin|xyz',
        'granted for project',
      ),
    );

    expect(result.grantedBy).toBe('admin|xyz');
    expect(result.note).toBe('granted for project');
  });
});
