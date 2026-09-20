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
import { RoleFilter } from '../../domain/aggregates/role/role.aggregate';
import { ListRolesQuery } from '../../application/queries/list-roles/list-roles.query';
import { GetRoleQuery } from '../../application/queries/get-role/get-role.query';
import { CreateRoleCommand } from '../../application/commands/create-role/create-role.command';
import { UpdateRoleCommand } from '../../application/commands/update-role/update-role.command';
import { DeleteRoleCommand } from '../../application/commands/delete-role/delete-role.command';
import { SyncRolePermissionsCommand } from '../../application/commands/sync-role-permissions/sync-role-permissions.command';
import {
  CreateCatalogItemRequestDto,
  ListAuthCatalogQueryDto,
  SyncRolePermissionsRequestDto,
  UpdateCatalogItemRequestDto,
} from '../../application/dtos/request/auth-request.dtos';
import { RoleResponseDto } from '../../application/dtos/response/auth-response.dtos';
import { RequirePermissions } from '../decorators/require-permissions.decorator';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — Roles')
@Controller('auth/roles')
export class RolesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions('read:roles')
  @ApiOperation({ summary: 'List roles (excludes shadow by default)' })
  @ApiAutoPagedResponse(RoleResponseDto)
  listRoles(@Query() query: ListAuthCatalogQueryDto): Promise<PagedResponse<RoleResponseDto>> {
    return this.queryBus.execute(
      new ListRolesQuery(
        new BaseFilter<RoleFilter>(
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
  @RequirePermissions('create:roles')
  @ApiOperation({ summary: 'Create a role' })
  @ApiBody({ type: CreateCatalogItemRequestDto })
  @ApiAutoResponse(RoleResponseDto, { status: 201 })
  createRole(@Body() dto: CreateCatalogItemRequestDto): Promise<RoleResponseDto> {
    return this.commandBus.execute(new CreateRoleCommand(dto.key, dto.description));
  }

  @Get(':key')
  @RequirePermissions('read:roles')
  @ApiOperation({ summary: 'Get role by key (includes permissions)' })
  @ApiKeyParam('key', 'volunteer_coordinator', 'Unique role key')
  @ApiAutoResponse(RoleResponseDto)
  getRole(@Param('key') key: string): Promise<RoleResponseDto> {
    return this.queryBus.execute(new GetRoleQuery(key));
  }

  @Patch(':key')
  @RequirePermissions('update:roles')
  @ApiOperation({ summary: 'Update role description' })
  @ApiKeyParam('key', 'volunteer_coordinator', 'Unique role key')
  @ApiBody({ type: UpdateCatalogItemRequestDto })
  @ApiAutoResponse(RoleResponseDto)
  updateRole(
    @Param('key') key: string,
    @Body() dto: UpdateCatalogItemRequestDto,
  ): Promise<RoleResponseDto> {
    return this.commandBus.execute(new UpdateRoleCommand(key, dto.description));
  }

  @Put(':key/permissions')
  @RequirePermissions('update:roles')
  @ApiOperation({ summary: 'Replace role permission mappings' })
  @ApiKeyParam('key', 'volunteer_coordinator', 'Unique role key')
  @ApiBody({ type: SyncRolePermissionsRequestDto })
  @ApiAutoResponse(RoleResponseDto)
  syncRolePermissions(
    @Param('key') key: string,
    @Body() dto: SyncRolePermissionsRequestDto,
  ): Promise<RoleResponseDto> {
    return this.commandBus.execute(
      new SyncRolePermissionsCommand(key, dto.permissionKeys ?? []),
    );
  }

  @Delete(':key')
  @RequirePermissions('delete:roles')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a role' })
  @ApiKeyParam('key', 'volunteer_coordinator', 'Unique role key')
  @ApiAutoVoidResponse({ status: 204 })
  async deleteRole(@Param('key') key: string): Promise<void> {
    await this.commandBus.execute(new DeleteRoleCommand(key));
  }
}
