import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProduces,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { AuthUser, CurrentUser, RequirePermissions, UnifiedAuthGuard, requireUserId } from '@ssdev-toolkit/nestjs-auth';
import {
  ApiAutoResponse,
  ApiAutoPrimitiveResponse,
  ApiAutoVoidResponse,
  ApiKeyParam,
  ApiUuidParam,
  ENVELOPE_EXAMPLES,
} from '@ssdev-toolkit/nestjs-core';
import { DocumentVisibility } from '../../domain/enums/document-visibility.enum';
import { UploadDocumentCommand } from '../../application/commands/upload-document/upload-document.command';
import { DeleteDocumentCommand } from '../../application/commands/delete-document/delete-document.command';
import { RenameDocumentCommand } from '../../application/commands/rename-document/rename-document.command';
import { ListDocumentsQuery } from '../../application/queries/list-documents/list-documents.query';
import { GetSignedUrlQuery } from '../../application/queries/get-signed-url/get-signed-url.query';
import { DownloadDocumentQuery } from '../../application/queries/download-document/download-document.query';
import { DocumentResponseDto, ListDocumentsResponseDto } from '../dtos/document-response.dto';
import { DownloadDocumentResult } from '../../application/queries/download-document/download-document.handler';
import { UploadDocumentRequestDto } from '../dtos/upload-document-request.dto';
import { RenameDocumentRequestDto } from '../dtos/rename-document-request.dto';

@ApiTags('DMS')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(UnifiedAuthGuard)
@Controller('dms')
export class Dms2Controller {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create:documents')
  @ApiAutoResponse(DocumentResponseDto, { status: 201 })
  uploadDocument(
    @Body() body: UploadDocumentRequestDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<DocumentResponseDto> {
    const userId = requireUserId(authUser);
    return this.commandBus.execute(
      new UploadDocumentCommand(
        Buffer.from(body.fileBase64, 'base64'),
        body.fileName,
        body.contentType,
        body.mappings,
        body.visibility ?? DocumentVisibility.Private,
        userId,
        authUser.permissions ?? [],
        userId,
      ),
    );
  }

  @Get(':entityType/:entityId/documents')
  @RequirePermissions('read:documents')
  @ApiKeyParam('entityType', 'PROJECT', 'Type of the entity the documents are mapped to')
  @ApiUuidParam('entityId', 'Identifier of the entity the documents are mapped to')
  @ApiAutoResponse(ListDocumentsResponseDto)
  listDocuments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentUser() authUser: AuthUser,
  ): Promise<ListDocumentsResponseDto> {
    return this.queryBus.execute(
      new ListDocumentsQuery(
        entityType,
        entityId,
        requireUserId(authUser),
        authUser.permissions ?? [],
      ),
    );
  }

  @Get('document/:id/url')
  @RequirePermissions('read:documents')
  @ApiUuidParam('id', 'Identifier of the document')
  @ApiAutoPrimitiveResponse('string', { description: 'Signed document URL' })
  @ApiOkResponse({
    example: {
      ...ENVELOPE_EXAMPLES,
      responsePayload:
        'https://storage.googleapis.com/nabarun-dms/vendor-invoice-2026-0117.pdf?token=abc123',
    },
  })
  getSignedUrl(
    @Param('id') id: string,
    @CurrentUser() authUser: AuthUser,
  ): Promise<string> {
    return this.queryBus.execute(
      new GetSignedUrlQuery(id, requireUserId(authUser), authUser.permissions ?? []),
    );
  }

  @Get('document/:id/download')
  @RequirePermissions('read:documents')
  @ApiUuidParam('id', 'Identifier of the document')
  @ApiProduces('application/octet-stream')
  @ApiResponse({
    status: 200,
    description:
      'Binary document stream. The original file name is carried in the Content-Disposition header.',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary', example: '<binary document bytes>' },
      },
    },
  })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async downloadDocument(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() authUser: AuthUser,
  ): Promise<StreamableFile> {
    const result: DownloadDocumentResult = await this.queryBus.execute(
      new DownloadDocumentQuery(id, requireUserId(authUser), authUser.permissions ?? []),
    );

    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
    });

    return new StreamableFile(result.stream);
  }

  @Patch('document/:id/rename')
  @RequirePermissions('update:documents')
  @ApiUuidParam('id', 'Identifier of the document')
  @ApiAutoResponse(DocumentResponseDto)
  renameDocument(
    @Param('id') id: string,
    @Body() body: RenameDocumentRequestDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<DocumentResponseDto> {
    return this.commandBus.execute(
      new RenameDocumentCommand(
        id,
        body.newName,
        requireUserId(authUser),
        authUser.permissions ?? [],
      ),
    );
  }

  @Delete('document/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete:documents')
  @ApiUuidParam('id', 'Identifier of the document')
  @ApiAutoVoidResponse({ status: 204 })
  deleteDocument(
    @Param('id') id: string,
    @CurrentUser() authUser: AuthUser,
  ): Promise<void> {
    return this.commandBus.execute(
      new DeleteDocumentCommand(id, requireUserId(authUser), authUser.permissions ?? []),
    );
  }
}
