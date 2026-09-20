import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { DocumentNotFoundError } from '../../../domain/errors/document.errors';
import { IDocumentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IStorageProvider } from '../../../domain/ports/storage.port';
import { IDocumentRepository } from '../../../domain/repositories/document.repository';
import { DMS2_OPTIONS } from '../../../infrastructure/dms-options.application-token';
import { DmsModuleOptions } from '../../../dms.schema';
import { assertDocumentEntityAccessAny } from '../../utilities/document-entity-access.util';
import { GetSignedUrlQuery } from './get-signed-url.query';

@QueryHandler(GetSignedUrlQuery)
@Injectable()
export class GetSignedUrlHandler implements IQueryHandler<GetSignedUrlQuery, string> {
  private readonly logger = new Logger(GetSignedUrlHandler.name);

  constructor(
    @Inject(IDocumentRepository)
    private readonly repo: IDocumentRepository,
    @Inject(IStorageProvider)
    private readonly storageProvider: IStorageProvider,
    @Inject(DMS2_OPTIONS)
    private readonly options: DmsModuleOptions,
    @Optional()
    @Inject(IDocumentEntityAccessPort)
    private readonly accessPort: IEntityAccessPort | null,
  ) { }

  async execute(query: GetSignedUrlQuery): Promise<string> {
    const { documentId, userId, userPermissions } = query;

    // 1. Load document
    const doc = await this.repo.findById(documentId);
    if (!doc) throw new DocumentNotFoundError(documentId);

    // HIGH-3: Public documents are freely accessible — skip all permission and
    // entity-level access checks so DocumentVisibility.Public has a real effect.
    if (!doc.isPublic) {
      // CRITICAL-2: Warn when record-level access port is not configured but doc has mappings
      if (!this.accessPort && doc.mappings.length > 0) {
        this.logger.warn(
          `[DMS2] IDocumentEntityAccessPort is not configured — record-level entity access check ` +
          `is BYPASSED for document ${documentId}. Register an IEntityAccessPort adapter on ` +
          `IDocumentEntityAccessPort to enable entity-level access control.`,
        );
      }

      // 2. Entity-type + record-level access — any mapping may grant access
      await assertDocumentEntityAccessAny(
        this.options,
        this.accessPort,
        doc.mappings.map((m) => ({ entityType: m.refType, entityId: m.refId })),
        { userId, userPermissions, action: 'read' },
      );
    }

    return this.storageProvider.getSignedUrl(doc.remotePath, doc.storageOwnerId);
  }
}
