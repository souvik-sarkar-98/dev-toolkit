import { Inject, Injectable, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  EntityTypeForbiddenError,
  EntityAccessDeniedError,
  IEntityAccessPort,
  resolvePublicErrorMessage,
} from '@ssdev-toolkit/nestjs-core';
import { IDocumentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IDocumentRepository } from '../../../domain/repositories/document.repository';
import { DMS2_OPTIONS } from '../../../infrastructure/dms-options.application-token';
import { DmsModuleOptions } from '../../../dms.schema';
import { ListDocumentsResponseDto } from '../../../presentation/dtos/document-response.dto';
import { DocumentResponseMapper } from '../../mappers/document-response.mapper';
import { assertDocumentEntityAccess } from '../../utilities/document-entity-access.util';
import { ListDocumentsQuery } from './list-documents.query';

@QueryHandler(ListDocumentsQuery)
@Injectable()
export class ListDocumentsHandler implements IQueryHandler<ListDocumentsQuery, ListDocumentsResponseDto> {
  constructor(
    @Inject(IDocumentRepository)
    private readonly repo: IDocumentRepository,
    @Inject(DMS2_OPTIONS)
    private readonly options: DmsModuleOptions,
    @Optional()
    @Inject(IDocumentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) { }

  async execute(query: ListDocumentsQuery): Promise<ListDocumentsResponseDto> {
    const { entityType, entityId, userId, userPermissions } = query;

    try {
      await assertDocumentEntityAccess(this.options, this.accessPort, {
        entityType,
        entityId,
        userId,
        userPermissions,
        action: 'read',
      });
    } catch (err) {
      if (err instanceof EntityTypeForbiddenError || err instanceof EntityAccessDeniedError) {
        return {
          hasAccess: false,
          reason: err.errorCode,
          message: resolvePublicErrorMessage(err),
          data: [],
        };
      }
      throw err;
    }

    // 3. Fetch and map
    const docs = await this.repo.findAllByEntity(entityType, entityId);
    return { hasAccess: true, data: DocumentResponseMapper.toDtoList(docs) };
  }
}
