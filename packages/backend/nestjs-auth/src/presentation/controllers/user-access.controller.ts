import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiAutoResponse,
  ApiIdpSubParam,
  ApiStringQuery,
  ApiUuidParam,
} from '@ssdev-toolkit/nestjs-core';
import { GrantUserRoleCommand } from '../../application/commands/grant-user-role/grant-user-role.command';
import { RevokeUserRoleCommand } from '../../application/commands/revoke-user-role/revoke-user-role.command';
import { GrantUserPermissionCommand } from '../../application/commands/grant-user-permission/grant-user-permission.command';
import { RevokeUserPermissionCommand } from '../../application/commands/revoke-user-permission/revoke-user-permission.command';
import { AddUserToGroupCommand } from '../../application/commands/add-user-to-group/add-user-to-group.command';
import { RemoveUserFromGroupCommand } from '../../application/commands/remove-user-from-group/remove-user-from-group.command';
import { ListUserRolesQuery } from '../../application/queries/list-user-roles/list-user-roles.query';
import { ListUserGroupsQuery } from '../../application/queries/list-user-groups/list-user-groups.query';
import { ListUserPermissionsQuery } from '../../application/queries/list-user-permissions/list-user-permissions.query';
import { ResolveUserAccessQuery } from '../../application/queries/resolve-user-access/resolve-user-access.query';
import {
  GrantRoleRequestDto,
  GrantPermissionRequestDto,
  AddToGroupRequestDto,
} from '../../application/dtos/request/auth-request.dtos';
import {
  RbacResponseDto,
  UserPermissionResponseDto,
  UserRoleGroupResponseDto,
  UserRoleResponseDto,
} from '../../application/dtos/response/auth-response.dtos';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { AuthUser } from '../../application/models/auth-user';
import { requireUserId } from '../../application/utilities/require-user-id.util';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — User Roles')
@Controller('auth/rbac/users/:idpSub')
export class UserRolesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  /** Audit fields use app profile UUID only. */
  private auditId(caller: AuthUser): string {
    return requireUserId(caller);
  }

  // ── User roles ─────────────────────────────────────────────────────────────────────
  @Get('direct-roles')
  @RequirePermissions('read:user_roles')
  @ApiOperation({ summary: 'List active roles for a user' })
  @ApiIdpSubParam()
  @ApiStringQuery('all', 'true', 'Set to "true" to include revoked grants')
  @ApiAutoResponse(UserRoleResponseDto, { isArray: true })
  listUserRoles(
    @Param('idpSub') idpSub: string,
    @Query('all') all?: string,
  ): Promise<UserRoleResponseDto[]> {
    return this.queryBus.execute(new ListUserRolesQuery(idpSub, all !== 'true'));
  }

  @Post('direct-roles')
  @RequirePermissions('create:user_roles')
  @ApiOperation({ summary: 'Grant a role to a user' })
  @ApiIdpSubParam()
  @ApiBody({ type: GrantRoleRequestDto })
  @ApiAutoResponse(UserRoleResponseDto, { status: 201 })
  grantRole(
    @Param('idpSub') idpSub: string,
    @Body() dto: GrantRoleRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserRoleResponseDto> {
    return this.commandBus.execute(
      new GrantUserRoleCommand(idpSub, dto.roleKey, dto.ownerId, this.auditId(caller), dto.note, dto.entityId, dto.entityType),
    );
  }

  @Delete('direct-roles/:roleId')
  @RequirePermissions('delete:user_roles')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  @ApiIdpSubParam()
  @ApiUuidParam('roleId', 'Identifier of the role grant to revoke (UUID)')
  @ApiAutoResponse(UserRoleResponseDto)
  revokeRole(
    @Param('idpSub') idpSub: string,
    @Param('roleId') roleId: string,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserRoleResponseDto> {
    return this.commandBus.execute(new RevokeUserRoleCommand(idpSub, roleId, this.auditId(caller)));
  }

  // ── User permissions ─────────────────────────────────────────────────────────────────────
  @Get('direct-permissions')
  @RequirePermissions('read:user_permissions')
  @ApiOperation({ summary: 'List direct permission grants for a user (not role-derived)' })
  @ApiIdpSubParam()
  @ApiStringQuery('all', 'true', 'Set to "true" to include revoked grants')
  @ApiAutoResponse(UserPermissionResponseDto, { isArray: true })
  listUserPermissions(
    @Param('idpSub') idpSub: string,
    @Query('all') all?: string,
  ): Promise<UserPermissionResponseDto[]> {
    return this.queryBus.execute(new ListUserPermissionsQuery(idpSub, all !== 'true'));
  }

  @Post('direct-permissions')
  @RequirePermissions('create:user_permissions')
  @ApiOperation({ summary: 'Grant a permission directly to a user' })
  @ApiIdpSubParam()
  @ApiBody({ type: GrantPermissionRequestDto })
  @ApiAutoResponse(UserPermissionResponseDto, { status: 201 })
  grantPermission(
    @Param('idpSub') idpSub: string,
    @Body() dto: GrantPermissionRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserPermissionResponseDto> {
    return this.commandBus.execute(
      new GrantUserPermissionCommand(
        idpSub,
        dto.permissionKey,
        dto.ownerId,
        this.auditId(caller),
        dto.note,
        dto.entityId,
        dto.entityType,
      ),
    );
  }

  @Delete('direct-permissions/:grantId')
  @RequirePermissions('delete:user_permissions')
  @ApiOperation({ summary: 'Revoke a direct permission grant from a user' })
  @ApiIdpSubParam()
  @ApiUuidParam('grantId', 'Identifier of the permission grant to revoke (UUID)')
  @ApiAutoResponse(UserPermissionResponseDto)
  revokePermission(
    @Param('idpSub') idpSub: string,
    @Param('grantId') grantId: string,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserPermissionResponseDto> {
    return this.commandBus.execute(
      new RevokeUserPermissionCommand(idpSub, grantId, this.auditId(caller)),
    );
  }

  // ── User groups ─────────────────────────────────────────────────────────────────────
  @Get('direct-groups')
  @RequirePermissions('read:user_role_groups')
  @ApiOperation({ summary: 'List group memberships for a user' })
  @ApiIdpSubParam()
  @ApiStringQuery('all', 'true', 'Set to "true" to include revoked memberships')
  @ApiAutoResponse(UserRoleGroupResponseDto, { isArray: true })
  listUserGroups(
    @Param('idpSub') idpSub: string,
    @Query('all') all?: string,
  ): Promise<UserRoleGroupResponseDto[]> {
    return this.queryBus.execute(new ListUserGroupsQuery(idpSub, all !== 'true'));
  }

  @Post('direct-groups')
  @RequirePermissions('create:user_role_groups')
  @ApiOperation({ summary: 'Add a user to a role group' })
  @ApiIdpSubParam()
  @ApiBody({ type: AddToGroupRequestDto })
  @ApiAutoResponse(UserRoleGroupResponseDto, { status: 201 })
  addToGroup(
    @Param('idpSub') idpSub: string,
    @Body() dto: AddToGroupRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserRoleGroupResponseDto> {
    return this.commandBus.execute(
      new AddUserToGroupCommand(idpSub, dto.groupKey, dto.ownerId, this.auditId(caller), dto.note, dto.entityId, dto.entityType),
    );
  }

  @Delete('direct-groups/:membershipId')
  @RequirePermissions('delete:user_role_groups')
  @ApiOperation({ summary: 'Remove a user from a role group' })
  @ApiIdpSubParam()
  @ApiUuidParam('membershipId', 'Identifier of the group membership to remove (UUID)')
  @ApiAutoResponse(UserRoleGroupResponseDto)
  removeFromGroup(
    @Param('idpSub') idpSub: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() caller: AuthUser,
  ): Promise<UserRoleGroupResponseDto> {
    return this.commandBus.execute(
      new RemoveUserFromGroupCommand(idpSub, membershipId, this.auditId(caller)),
    );
  }

  // ── User access ─────────────────────────────────────────────────────────────────────
  @Get('access')
  @RequirePermissions('read:user_roles')
  @ApiOperation({ summary: 'Resolve full RBAC access for a user' })
  @ApiIdpSubParam()
  @ApiAutoResponse(RbacResponseDto)
  resolveAccess(@Param('idpSub') idpSub: string): Promise<RbacResponseDto> {
    return this.queryBus.execute(new ResolveUserAccessQuery(idpSub));
  }
}
