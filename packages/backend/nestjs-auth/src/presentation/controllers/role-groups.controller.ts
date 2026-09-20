import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
  ApiAutoPagedResponse,
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  BaseFilter,
  PagedResponse,
} from '@ssdev-toolkit/nestjs-core';
import { RoleGroupFilter } from '../../domain/aggregates/role-group/role-group.aggregate';
import { ListRoleGroupsQuery } from '../../application/queries/list-role-groups/list-role-groups.query';
import { GetRoleGroupQuery } from '../../application/queries/get-role-group/get-role-group.query';
import { CreateRoleGroupCommand } from '../../application/commands/create-role-group/create-role-group.command';
import { UpdateRoleGroupCommand } from '../../application/commands/update-role-group/update-role-group.command';
import { DeleteRoleGroupCommand } from '../../application/commands/delete-role-group/delete-role-group.command';
import { SyncRoleGroupRolesCommand } from '../../application/commands/sync-role-group-roles/sync-role-group-roles.command';
import {
  CreateCatalogItemRequestDto,
  ListAuthCatalogQueryDto,
  SyncRoleGroupRolesRequestDto,
  UpdateCatalogItemRequestDto,
} from '../../application/dtos/request/auth-request.dtos';
import { RoleGroupResponseDto } from '../../application/dtos/response/role-group-response.dto';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { AuthUser } from '../../application/models/auth-user';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — Role Groups')
@Controller('auth/role-groups')
export class RoleGroupsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions('read:role_groups')
  @ApiOperation({ summary: 'List role groups (excludes shadow by default)' })
  @ApiAutoPagedResponse(RoleGroupResponseDto)
  listRoleGroups(
    @Query() query: ListAuthCatalogQueryDto,
  ): Promise<PagedResponse<RoleGroupResponseDto>> {
    return this.queryBus.execute(
      new ListRoleGroupsQuery(
        new BaseFilter<RoleGroupFilter>(
          query.includeShadow ? undefined : { isShadow: false },
          query.pageIndex,
          query.pageSize,
          query.sortBy,
          query.sortDir,
        ),
      ),
    );
  }

  @Post()
  @RequirePermissions('create:role_groups')
  @ApiOperation({ summary: 'Create a role group' })
  @ApiBody({ type: CreateCatalogItemRequestDto })
  @ApiAutoResponse(RoleGroupResponseDto, { status: 201 })
  createRoleGroup(
    @Body() dto: CreateCatalogItemRequestDto,
  ): Promise<RoleGroupResponseDto> {
    return this.commandBus.execute(
      new CreateRoleGroupCommand(dto.key, dto.description),
    );
  }

  @Get(':key')
  @RequirePermissions('read:role_groups')
  @ApiOperation({ summary: 'Get role group by key' })
  @ApiKeyParam('key', 'field_team', 'Unique role group key')
  @ApiAutoResponse(RoleGroupResponseDto)
  getRoleGroup(@Param('key') key: string): Promise<RoleGroupResponseDto> {
    return this.queryBus.execute(new GetRoleGroupQuery(key));
  }

  @Patch(':key')
  @RequirePermissions('update:role_groups')
  @ApiOperation({ summary: 'Update role group description' })
  @ApiKeyParam('key', 'field_team', 'Unique role group key')
  @ApiBody({ type: UpdateCatalogItemRequestDto })
  @ApiAutoResponse(RoleGroupResponseDto)
  updateRoleGroup(
    @Param('key') key: string,
    @Body() dto: UpdateCatalogItemRequestDto,
  ): Promise<RoleGroupResponseDto> {
    return this.commandBus.execute(
      new UpdateRoleGroupCommand(key, dto.description),
    );
  }

  @Put(':key/roles')
  @RequirePermissions('update:role_groups')
  @ApiOperation({ summary: 'Replace role-group role mappings and re-expand member grants' })
  @ApiKeyParam('key', 'field_team', 'Unique role group key')
  @ApiBody({ type: SyncRoleGroupRolesRequestDto })
  @ApiAutoResponse(RoleGroupResponseDto)
  syncRoleGroupRoles(
    @Param('key') key: string,
    @Body() dto: SyncRoleGroupRolesRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<RoleGroupResponseDto> {
    return this.commandBus.execute(
      new SyncRoleGroupRolesCommand(key, dto.roleKeys ?? [], caller.idpSub),
    );
  }

  @Delete(':key')
  @RequirePermissions('delete:role_groups')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a role group' })
  @ApiKeyParam('key', 'field_team', 'Unique role group key')
  @ApiAutoVoidResponse({ status: 204 })
  async deleteRoleGroup(@Param('key') key: string): Promise<void> {
    await this.commandBus.execute(new DeleteRoleGroupCommand(key));
  }
}
