import 'reflect-metadata';
import { OnUserRoleRevokedHandler } from './on-user-role-revoked.handler';
import { UserRoleRevokedEvent, type UserRoleRevokedSnapshot } from '../../../../domain/events/user-role-revoked.event';
import { UserRole } from '../../../../domain/aggregates/user-role/user-role.aggregate';

const makeRbac = () => ({
  invalidate: jest.fn().mockResolvedValue(undefined),
  resolve: jest.fn(),
});

function makeRevokedUserRole(idpSub = 'user|abc'): UserRole {
  const userRole = UserRole.grant({ idpSub, roleId: 'role-id-1' });
  userRole.revoke('admin|xyz');
  return userRole;
}

describe('OnUserRoleRevokedHandler', () => {
  let rbac: ReturnType<typeof makeRbac>;
  let handler: OnUserRoleRevokedHandler;

  beforeEach(() => {
    rbac = makeRbac();
    handler = new OnUserRoleRevokedHandler(rbac as any);
  });

  it('invalidates the user access cache with the correct idpSub', async () => {
    const userRole = makeRevokedUserRole('user|revoked');
    const event = new UserRoleRevokedEvent(userRole.toSnapshot<UserRoleRevokedSnapshot>());

    await handler.handle(event);

    expect(rbac.invalidate).toHaveBeenCalledWith('user|revoked');
    expect(rbac.invalidate).toHaveBeenCalledTimes(1);
  });
});
