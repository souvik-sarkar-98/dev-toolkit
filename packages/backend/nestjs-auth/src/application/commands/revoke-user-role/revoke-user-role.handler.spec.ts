import 'reflect-metadata';
import { RevokeUserRoleHandler } from './revoke-user-role.handler';
import { RevokeUserRoleCommand } from './revoke-user-role.command';
import { UserRole } from '../../../domain/aggregates/user-role/user-role.aggregate';
import { UserRoleNotFoundError } from '../../../domain/errors/auth.errors';

const makeRepo = () => ({
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
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

const makeEventBus = () => ({ publishAll: jest.fn() });

function makeUserRole(): UserRole {
  return UserRole.grant({ idpSub: 'user|abc', roleId: 'role-id-1' });
}

describe('RevokeUserRoleHandler', () => {
  let repo: ReturnType<typeof makeRepo>;
  let eventBus: ReturnType<typeof makeEventBus>;
  let handler: RevokeUserRoleHandler;

  beforeEach(() => {
    repo = makeRepo();
    eventBus = makeEventBus();
    handler = new RevokeUserRoleHandler(repo as any, eventBus as any);
  });

  it('revokes the user role, persists and returns the DTO', async () => {
    const userRole = makeUserRole();
    userRole.clearEvents();
    repo.findById.mockResolvedValue(userRole);

    const result = await handler.execute(
      new RevokeUserRoleCommand('user|abc', userRole.id, 'admin|xyz'),
    );

    expect(userRole.isActive()).toBe(false);
    expect(userRole.revokedBy).toBe('admin|xyz');
    expect(repo.update).toHaveBeenCalledWith(userRole.id, userRole);
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(result.revokedAt).toBeDefined();
  });

  it('throws UserRoleNotFoundError when the assignment does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new RevokeUserRoleCommand('user|abc', 'nonexistent-id', 'admin|xyz')),
    ).rejects.toThrow(UserRoleNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
