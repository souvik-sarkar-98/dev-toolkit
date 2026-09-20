import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
  ApiAutoPagedResponse,
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  BaseFilter,
  PagedResponse,
  PaginatedQueryDto,
} from '@ssdev-toolkit/nestjs-core';
import { PermissionFilter } from '../../domain/aggregates/permission/permission.aggregate';
import { ListPermissionsQuery } from '../../application/queries/list-permissions/list-permissions.query';
import { GetPermissionQuery } from '../../application/queries/get-permission/get-permission.query';
import { CreatePermissionCommand } from '../../application/commands/create-permission/create-permission.command';
import { UpdatePermissionCommand } from '../../application/commands/update-permission/update-permission.command';
import { DeletePermissionCommand } from '../../application/commands/delete-permission/delete-permission.command';
import {
  CreateCatalogItemRequestDto,
  UpdateCatalogItemRequestDto,
} from '../../application/dtos/request/auth-request.dtos';
import { PermissionResponseDto } from '../../application/dtos/response/auth-response.dtos';
import { RequirePermissions } from '../decorators/require-permissions.decorator';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — Permissions')
@Controller('auth/permissions')
export class PermissionsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequirePermissions('read:permissions')
  @ApiOperation({ summary: 'List all permissions' })
  @ApiAutoPagedResponse(PermissionResponseDto)
  listPermissions(
    @Query() query: PaginatedQueryDto,
  ): Promise<PagedResponse<PermissionResponseDto>> {
    return this.queryBus.execute(
      new ListPermissionsQuery(
        new BaseFilter<PermissionFilter>(
          undefined,
          query.pageIndex,
          query.pageSize,
          query.sortBy,
          query.sortDir,
        ),
      ),
    );
  }

  @Post()
  @RequirePermissions('create:permissions')
  @ApiOperation({ summary: 'Create a permission' })
  @ApiBody({ type: CreateCatalogItemRequestDto })
  @ApiAutoResponse(PermissionResponseDto, { status: 201 })
  createPermission(
    @Body() dto: CreateCatalogItemRequestDto,
  ): Promise<PermissionResponseDto> {
    return this.commandBus.execute(
      new CreatePermissionCommand(dto.key, dto.description),
    );
  }

  @Get(':key')
  @RequirePermissions('read:permissions')
  @ApiOperation({ summary: 'Get permission by key' })
  @ApiKeyParam('key', 'read:projects', 'Unique permission key')
  @ApiAutoResponse(PermissionResponseDto)
  getPermission(@Param('key') key: string): Promise<PermissionResponseDto> {
    return this.queryBus.execute(new GetPermissionQuery(key));
  }

  @Patch(':key')
  @RequirePermissions('update:permissions')
  @ApiOperation({ summary: 'Update permission description' })
  @ApiKeyParam('key', 'read:projects', 'Unique permission key')
  @ApiBody({ type: UpdateCatalogItemRequestDto })
  @ApiAutoResponse(PermissionResponseDto)
  updatePermission(
    @Param('key') key: string,
    @Body() dto: UpdateCatalogItemRequestDto,
  ): Promise<PermissionResponseDto> {
    return this.commandBus.execute(
      new UpdatePermissionCommand(key, dto.description),
    );
  }

  @Delete(':key')
  @RequirePermissions('delete:permissions')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a permission' })
  @ApiKeyParam('key', 'read:projects', 'Unique permission key')
  @ApiAutoVoidResponse({ status: 204 })
  async deletePermission(@Param('key') key: string): Promise<void> {
    await this.commandBus.execute(new DeletePermissionCommand(key));
  }
}
