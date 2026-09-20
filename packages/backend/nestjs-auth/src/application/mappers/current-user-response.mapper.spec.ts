import { mapAuthUserToResponse } from './current-user-response.mapper';
import { AuthUser } from '../models/auth-user';

function jwtUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    type: 'jwt',
    idpSub: 'auth0|abc',
    userId: 'u-1',
    email: 'asha.verma@example.org',
    permissions: ['read:projects'],
    userRoles: ['editor'],
    roleGroups: ['field_team'],
    idpClaims: { sub: 'auth0|abc' },
    userInfo: {
      id: 'u-1',
      firstName: 'Asha',
      lastName: 'Verma',
      fullName: 'Asha Verma',
      phoneNo: '+919876543210',
      attributes: new Map([['profileComplete', true]]),
    },
    ...overrides,
  };
}

describe('mapAuthUserToResponse', () => {
  it('flattens profile fields and passes userInfo through as attributes', () => {
    const user = jwtUser();
    expect(mapAuthUserToResponse(user)).toEqual({
      type: 'jwt',
      idpSub: 'auth0|abc',
      id: 'u-1',
      firstName: 'Asha',
      lastName: 'Verma',
      fullName: 'Asha Verma',
      email: 'asha.verma@example.org',
      permissions: ['read:projects'],
      userRoles: ['editor'],
      roleGroups: ['field_team'],
      idpClaims: { sub: 'auth0|abc' },
      attributes: user.userInfo,
      phoneNo: '+919876543210',
      scopedAccess: [],
    });
  });

  it('serialises nested Map attributes to an empty object in JSON', () => {
    const body = JSON.parse(JSON.stringify(mapAuthUserToResponse(jwtUser())));
    expect(body.attributes).toEqual({
      id: 'u-1',
      firstName: 'Asha',
      lastName: 'Verma',
      fullName: 'Asha Verma',
      phoneNo: '+919876543210',
      attributes: {},
    });
  });

  it('passes through incomplete userInfo without flattening nested attributes', () => {
    const userInfo = {
      id: 'u-1',
      attributes: new Map([['profileComplete', false]]),
    };
    const result = mapAuthUserToResponse(jwtUser({ userInfo }));

    expect(result.attributes).toEqual(userInfo);
  });

  it('passes through userInfo when nested attributes are already a plain object', () => {
    const userInfo = {
      id: 'u-1',
      attributes: { profileComplete: true } as unknown as Map<string, unknown>,
    };
    const result = mapAuthUserToResponse(jwtUser({ userInfo }));

    expect(result.attributes).toEqual(userInfo);
  });

  it('maps scopedAccess and leaves attributes undefined when userInfo is missing', () => {
    const authUser: AuthUser = {
      type: 'apikey',
      idpSub: 'apikey:key-1',
      permissions: [],
      userRoles: [],
      roleGroups: [],
      scopedAccess: [
        {
          entityId: 'proj-A',
          entityType: 'project',
          permissions: ['update:project'],
          userRoles: ['coordinator'],
          roleGroups: ['field_team'],
        },
      ],
    };

    const result = mapAuthUserToResponse(authUser);

    expect(result.id).toBeUndefined();
    expect(result.attributes).toBeUndefined();
    expect(result.scopedAccess).toEqual([
      {
        entityId: 'proj-A',
        entityType: 'project',
        permissions: ['update:project'],
        userRoles: ['coordinator'],
        roleGroups: ['field_team'],
      },
    ]);
  });
});
