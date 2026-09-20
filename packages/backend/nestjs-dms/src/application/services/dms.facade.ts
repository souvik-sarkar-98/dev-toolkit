import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UploadDocumentCommand } from '../commands/upload-document/upload-document.command';
import { DeleteDocumentCommand } from '../commands/delete-document/delete-document.command';
import { ListDocumentsQuery } from '../queries/list-documents/list-documents.query';
import { DownloadDocumentQuery } from '../queries/download-document/download-document.query';
import { DocumentResponseDto } from '../../presentation/dtos/document-response.dto';

/**
 * Programmatic DMS entry point for modules that do not use HTTP.
 * All operations dispatch through CommandBus / QueryBus so handler orchestration runs.
 */
@Injectable()
export class DmsFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    mappings: Array<{ entityType: string; entityId: string }>;
    visibility: string;
    userId: string;
    userPermissions: string[];
    storageOwnerId?: string;
  }): Promise<DocumentResponseDto> {
    return this.commandBus.execute(
      new UploadDocumentCommand(
        params.buffer,
        params.fileName,
        params.contentType,
        params.mappings,
        params.visibility,
        params.userId,
        params.userPermissions,
        params.storageOwnerId,
      ),
    );
  }

  async listByEntity(
    entityType: string,
    entityId: string,
    userId: string,
    userPermissions: string[],
  ): Promise<DocumentResponseDto[]> {
    const result = await this.queryBus.execute(
      new ListDocumentsQuery(entityType, entityId, userId, userPermissions),
    );
    return result.hasAccess ? result.data : [];
  }

  delete(documentId: string, userId: string, userPermissions: string[]): Promise<void> {
    return this.commandBus.execute(
      new DeleteDocumentCommand(documentId, userId, userPermissions),
    );
  }

  async download(
    documentId: string,
    userId: string,
    userPermissions: string[],
  ): Promise<{ fileName: string; contentType: string; buffer: Buffer }> {
    const result = await this.queryBus.execute(
      new DownloadDocumentQuery(documentId, userId, userPermissions),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of result.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      fileName: result.fileName,
      contentType: result.contentType,
      buffer: Buffer.concat(chunks),
    };
  }
}
