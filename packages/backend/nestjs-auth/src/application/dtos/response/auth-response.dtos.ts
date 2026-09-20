import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'Public site build key' }) name: string;
  @ApiProperty({ required: false, example: '' }) token?: string;
  @ApiProperty({ type: [String], example: ['read:projects', 'update:project'] }) permissions: string[];
  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' }) expiresAt?: Date;
  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' }) lastUsedAt?: Date;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) ownerId?: string;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) createdBy?: string;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) updatedAt: Date;
}

export class RoleResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'volunteer_coordinator' }) key: string;
  @ApiProperty({ required: false, example: 'Volunteer Coordinator' }) description?: string;
  @ApiProperty({
    description: 'Shadow roles are platform/break-glass and hidden from member pickers by default.',
    example: false,
    default: false,
  })
  isShadow!: boolean;
  @ApiProperty({ type: [String], example: ['read:projects', 'update:project'] }) permissionKeys: string[];
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) createdAt: Date;
}

export class PermissionResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'read:projects' }) key: string;
  @ApiProperty({ required: false, example: 'Read project' }) description?: string;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) createdAt: Date;
}

export class UserRoleResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'auth0|65f1a2b3c4d5e6f708192a3b' }) idpSub: string;
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) roleId: string;
  @ApiProperty({ required: false, example: 'volunteer_coordinator' }) roleKey?: string;
  @ApiProperty({ required: false, example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) sourceGroupId?: string;
  @ApiProperty({ required: false, example: 'proj-A' }) entityId?: string;
  @ApiProperty({ required: false, example: 'project' }) entityType?: string;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) grantedAt: Date;
  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' }) revokedAt?: Date;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) grantedBy?: string;
  @ApiProperty({ required: false, example: 'Granted for the 2026 monsoon relief drive' }) note?: string;
}

export class UserPermissionResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'auth0|65f1a2b3c4d5e6f708192a3b' }) idpSub: string;
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) permissionId: string;
  @ApiProperty({ required: false, example: 'read:projects' }) permissionKey?: string;
  @ApiProperty({ required: false, example: 'proj-A' }) entityId?: string;
  @ApiProperty({ required: false, example: 'project' }) entityType?: string;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) grantedAt: Date;
  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' }) revokedAt?: Date;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) grantedBy?: string;
  @ApiProperty({ required: false, example: 'One-off access for audit support' }) note?: string;
}

export class UserRoleGroupResponseDto {
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) id: string;
  @ApiProperty({ example: 'auth0|65f1a2b3c4d5e6f708192a3b' }) idpSub: string;
  @ApiProperty({ example: '3f8a1c92-5d47-4e0b-9a6f-2b7c8e1d4a55' }) groupId: string;
  @ApiProperty({ required: false, example: 'field_team' }) groupKey?: string;
  @ApiProperty({ required: false, example: 'proj-A' }) entityId?: string;
  @ApiProperty({ required: false, example: 'project' }) entityType?: string;
  @ApiProperty({ example: '2026-03-14T09:30:00.000Z' }) grantedAt: Date;
  @ApiProperty({ required: false, example: '2026-03-14T09:30:00.000Z' }) revokedAt?: Date;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) grantedBy?: string;
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) revokedBy?: string;
  @ApiProperty({ required: false, example: 'Added for the 2026 monsoon relief drive' }) note?: string;
}

class RbacContextResponseDto {
  @ApiProperty({ type: [String], example: ['read:projects', 'update:project'] }) permissions: string[];
  @ApiProperty({ type: [String], example: ['volunteer_coordinator'] }) userRoles: string[];
  @ApiProperty({ type: [String], example: ['field_team'] }) roleGroups: string[];
}

export class EntityScopeResponseDto extends RbacContextResponseDto {
  @ApiProperty({ example: 'proj-A' }) entityId: string;
  @ApiProperty({ example: 'project' }) entityType: string;
}

export class RbacResponseDto extends RbacContextResponseDto {
  @ApiProperty({
    required: false,
    type: [EntityScopeResponseDto],
  })
  scopedAccess?: EntityScopeResponseDto[];
}

export class AuthUserInfoResponseDto extends RbacResponseDto {
  @ApiProperty({ required: false, example: 'b41d7e60-9c38-4a15-8f27-6d0e2a9b3c41' }) id?: string;
  @ApiProperty({ required: false, example: 'auth0|65f1a2b3c4d5e6f708192a3b' }) idpSub?: string;
  @ApiProperty({ required: false, example: 'Asha' }) firstName?: string;
  @ApiProperty({ required: false, example: 'Verma' }) lastName?: string;
  @ApiProperty({ required: false, example: 'Asha Verma' }) fullName?: string;
  @ApiProperty({ required: false, example: 'asha.verma@example.org' }) email?: string;
  @ApiProperty({ required: false, example: '+919876543210' }) phoneNo?: string;
  @ApiProperty({
    required: false,
    type: Object,
    description: 'Extra profile attributes (e.g. profileComplete)',
    example: { profileComplete: true },
  })
  attributes?: Record<string, any>;
}

/** Payload of `GET /auth/me` — the resolved `AuthUser` of the caller. */
export class CurrentUserResponseDto extends AuthUserInfoResponseDto {
  @ApiProperty({ enum: ['jwt', 'apikey'], example: 'jwt' }) type: 'apikey' | 'jwt';
  @ApiProperty({
    required: false,
    type: Object,
    description: 'Raw IdP token claims — absent for API-key callers',
    example: {
      sub: 'auth0|65f1a2b3c4d5e6f708192a3b',
      email: 'asha.verma@example.org',
      iat: 1773480600,
    },
  })
  idpClaims?: Record<string, unknown>;
}
