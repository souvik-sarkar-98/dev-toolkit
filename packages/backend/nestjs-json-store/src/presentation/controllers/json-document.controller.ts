import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UnifiedAuthGuard, RequirePermissions, PermissionsGuard } from '@ssdev-toolkit/nestjs-auth';
import {
  ApiAutoResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  ApiUuidParam,
} from '@ssdev-toolkit/nestjs-core';
import { CreateJsonDocumentCommand } from '../../application/commands/create-json-document/create-json-document.command';
import { UpdateJsonDocumentCommand } from '../../application/commands/update-json-document/update-json-document.command';
import { UpsertJsonDocumentCommand } from '../../application/commands/upsert-json-document/upsert-json-document.command';
import { DeleteJsonDocumentCommand } from '../../application/commands/delete-json-document/delete-json-document.command';
import { GetJsonDocumentQuery } from '../../application/queries/get-json-document/get-json-document.query';
import { ListJsonDocumentsQuery } from '../../application/queries/list-json-documents/list-json-documents.query';
import {
  CreateJsonDocumentDto,
  JsonDocumentResponseDto,
  ListJsonDocumentsQueryDto,
  UpdateJsonDocumentDto,
} from '../../application/dtos/json-document.dtos';

@ApiTags('JSON Store')
@ApiBearerAuth('jwt')
@UseGuards(UnifiedAuthGuard, PermissionsGuard)
@Controller('json-store')
export class JsonDocumentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Get()
  @RequirePermissions('read:json_documents')
  @ApiOperation({ summary: 'List JSON documents, optionally filtered by namespace' })
  @ApiAutoResponse(JsonDocumentResponseDto, { isArray: true })
  list(@Query() query: ListJsonDocumentsQueryDto): Promise<JsonDocumentResponseDto[]> {
    return this.queryBus.execute(
      new ListJsonDocumentsQuery({ namespace: query.namespace }),
    );
  }

  // HIGH-1: Declared before ':namespace/:key' so NestJS first-match-wins routing
  // resolves GET by-id/{uuid} here, not as namespace='by-id', key='{uuid}'.
  @Get('by-id/:id')
  @RequirePermissions('read:json_documents')
  @ApiOperation({ summary: 'Get a JSON document by id' })
  @ApiUuidParam('id', 'Identifier of the JSON document')
  @ApiAutoResponse(JsonDocumentResponseDto)
  getById(@Param('id') id: string): Promise<JsonDocumentResponseDto> {
    return this.queryBus.execute(new GetJsonDocumentQuery({ id }));
  }

  @Get('by-namespace/:namespace/:key')
  @RequirePermissions('read:json_documents')
  @ApiOperation({ summary: 'Get a JSON document by namespace and key' })
  @ApiKeyParam('namespace', 'correspondence', 'Consumer namespace')
  @ApiKeyParam('key', 'welcome-email', 'Slug-style key, unique within the namespace')
  @ApiAutoResponse(JsonDocumentResponseDto)
  getByKey(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
  ): Promise<JsonDocumentResponseDto> {
    return this.queryBus.execute(new GetJsonDocumentQuery({ key, namespace }));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:json_documents')
  @ApiOperation({ summary: 'Create a new JSON document' })
  @ApiAutoResponse(JsonDocumentResponseDto, { status: 201 })
  create(@Body() dto: CreateJsonDocumentDto): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new CreateJsonDocumentCommand({
        key: dto.key,
        namespace: dto.namespace,
        payload: dto.payload,
      }),
    );
  }

  // Declared before ':namespace/:key' for the same first-match-wins reason as GET by-id/:id.
  @Put('by-id/:id')
  @RequirePermissions('update:json_documents')
  @ApiOperation({ summary: 'Update a JSON document payload by id' })
  @ApiUuidParam('id', 'Identifier of the JSON document')
  @ApiAutoResponse(JsonDocumentResponseDto)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateJsonDocumentDto,
  ): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new UpdateJsonDocumentCommand({ id, payload: dto.payload }),
    );
  }

  @Put('by-namespace/:namespace/:key')
  @RequirePermissions('update:json_documents')
  @ApiOperation({ summary: 'Upsert a JSON document by namespace and key' })
  @ApiKeyParam('namespace', 'correspondence', 'Consumer namespace')
  @ApiKeyParam('key', 'welcome-email', 'Slug-style key, unique within the namespace')
  @ApiAutoResponse(JsonDocumentResponseDto)
  upsert(
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Body() dto: UpdateJsonDocumentDto,
  ): Promise<JsonDocumentResponseDto> {
    return this.commandBus.execute(
      new UpsertJsonDocumentCommand({ key, namespace, payload: dto.payload }),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete:json_documents')
  @ApiOperation({ summary: 'Delete a JSON document by id' })
  @ApiUuidParam('id', 'Identifier of the JSON document')
  @ApiAutoVoidResponse({ status: 204 })
  delete(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteJsonDocumentCommand({ id }));
  }
}
