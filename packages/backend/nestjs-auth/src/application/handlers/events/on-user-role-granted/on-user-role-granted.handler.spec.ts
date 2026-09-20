import 'reflect-metadata';
import { OnUserRoleGrantedHandler } from './on-user-role-granted.handler';
import { UserRoleGrantedEvent, type UserRoleGrantedSnapshot } from '../../../../domain/events/user-role-granted.event';
import { UserRole } from '../../../../domain/aggregates/user-role/user-role.aggregate';

const makeRbac = () => ({
  invalidate: jest.fn().mockResolvedValue(undefined),
  resolve: jest.fn(),
});

function makeUserRole(idpSub = 'user|abc'): UserRole {
  return UserRole.grant({ idpSub, roleId: 'role-id-1' });
}

describe('OnUserRoleGrantedHandler', () => {
  let rbac: ReturnType<typeof makeRbac>;
  let handler: OnUserRoleGrantedHandler;

  beforeEach(() => {
    rbac = makeRbac();
    handler = new OnUserRoleGrantedHandler(rbac as any);
  });

  it('invalidates the user access cache with the correct idpSub', async () => {
    const userRole = makeUserRole('user|granted');
    const event = new UserRoleGrantedEvent(userRole.toSnapshot<UserRoleGrantedSnapshot>());

    await handler.handle(event);

    expect(rbac.invalidate).toHaveBeenCalledWith('user|granted');
    expect(rbac.invalidate).toHaveBeenCalledTimes(1);
  });
});
