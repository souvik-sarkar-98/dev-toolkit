import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiAutoPagedResponse,
  ApiAutoResponse,
  ApiAutoPrimitiveResponse,
  ApiUuidParam,
  BaseFilter,
  ENVELOPE_EXAMPLES,
  PagedResponse,
  PaginatedQueryDto,
} from '@ssdev-toolkit/nestjs-core';
import { GenerateApiKeyCommand } from '../../application/commands/generate-api-key/generate-api-key.command';
import { RevokeApiKeyCommand } from '../../application/commands/revoke-api-key/revoke-api-key.command';
import { UpdateApiKeyPermissionsCommand } from '../../application/commands/update-api-key-permissions/update-api-key-permissions.command';
import { ApiKeyFilter } from '../../domain/aggregates/api-key/api-key.aggregate';
import { ListApiKeysQuery } from '../../application/queries/list-api-keys/list-api-keys.query';
import { ListApiScopesQuery } from '../../application/queries/list-api-scopes/list-api-scopes.query';
import { GenerateApiKeyRequestDto, UpdateApiKeyPermissionsRequestDto } from '../../application/dtos/request/auth-request.dtos';
import { ApiKeyResponseDto } from '../../application/dtos/response/auth-response.dtos';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions } from '../decorators/require-permissions.decorator';
import { StrictThrottle } from '../decorators/throttle-presets';
import { AuthUser } from '../../application/models/auth-user';
import { requireUserId } from '../../application/utilities/require-user-id.util';

@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@ApiTags('Auth — API Keys')
@Controller('auth/apikey')
export class ApiKeyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post('generate')
  @RequirePermissions('create:api_keys')
  @StrictThrottle({ limit: 5 })
  @ApiOperation({ summary: 'Generate API Key' })
  @ApiBody({ type: GenerateApiKeyRequestDto })
  @ApiAutoResponse(ApiKeyResponseDto, { status: 201 })
  async generateApiKey(
    @Body() dto: GenerateApiKeyRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<ApiKeyResponseDto> {
    return this.commandBus.execute(
      new GenerateApiKeyCommand(
        dto.name,
        dto.permissions,
        caller.permissions ?? [],
        requireUserId(caller),
        dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        dto.ownerId,
      ),
    );
  }

  @Get('list')
  @RequirePermissions('read:api_keys')
  @ApiOperation({ summary: 'List all API keys' })
  @ApiAutoPagedResponse(ApiKeyResponseDto)
  async listApiKeys(
    @Query() query: PaginatedQueryDto,
    @CurrentUser() caller?: AuthUser,
  ): Promise<PagedResponse<ApiKeyResponseDto>> {
    return this.queryBus.execute(
      new ListApiKeysQuery(
        new BaseFilter<ApiKeyFilter>(undefined, query.pageIndex, query.pageSize, query.sortBy, query.sortDir),
        caller ? requireUserId(caller) : undefined,
      ),
    );
  }

  @Get('scopes')
  @RequirePermissions('read:api_keys')
  @ApiOperation({ summary: 'List all available permission scopes' })
  @ApiOkResponse({
    description: 'Permission scopes retrieved successfully',
    schema: {
      allOf: [
        {
          properties: {
            info: { type: 'string', example: 'Success' },
            timestamp: { type: 'string', format: 'date-time' },
            traceId: { type: 'string' },
            responsePayload: {
              type: 'array',
              items: { type: 'string' },
              example: ['read:projects', 'update:project'],
            },
          },
        },
      ],
    },
  })
  async listApiScopes(): Promise<string[]> {
    return this.queryBus.execute(new ListApiScopesQuery());
  }

  @Patch('permissions/:id')
  @RequirePermissions('update:api_keys')
  @ApiOperation({ summary: 'Update API key permissions' })
  @ApiUuidParam('id', 'Identifier of the API key (UUID)')
  @ApiBody({ type: UpdateApiKeyPermissionsRequestDto })
  @ApiAutoResponse(ApiKeyResponseDto)
  async updateApiKeyPermissions(
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyPermissionsRequestDto,
    @CurrentUser() caller: AuthUser,
  ): Promise<ApiKeyResponseDto> {
    return this.commandBus.execute(
      new UpdateApiKeyPermissionsCommand(id, dto.permissions, caller.permissions ?? []),
    );
  }

  @Delete('revoke/:id')
  @RequirePermissions('delete:api_keys')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiUuidParam('id', 'Identifier of the API key (UUID)')
  @ApiAutoPrimitiveResponse('boolean', {
    description: 'API key revoked — payload is `true` on success',
  })
  @ApiOkResponse({ example: { ...ENVELOPE_EXAMPLES, responsePayload: true } })
  async revokeApiKey(@Param('id') id: string): Promise<boolean> {
    return this.commandBus.execute(new RevokeApiKeyCommand(id));
  }
}
