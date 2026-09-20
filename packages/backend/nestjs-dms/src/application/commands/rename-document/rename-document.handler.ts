import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { DocumentNotFoundError } from '../../../domain/errors/document.errors';
import { IDocumentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IStorageProvider } from '../../../domain/ports/storage.port';
import { IDocumentRepository } from '../../../domain/repositories/document.repository';
import { DMS2_OPTIONS } from '../../../infrastructure/dms-options.application-token';
import { DmsModuleOptions } from '../../../dms.schema';
import { DocumentResponseDto } from '../../../presentation/dtos/document-response.dto';
import { DocumentResponseMapper } from '../../mappers/document-response.mapper';
import { assertDocumentEntityAccessAny } from '../../utilities/document-entity-access.util';
import { RenameDocumentCommand } from './rename-document.command';

@CommandHandler(RenameDocumentCommand)
@Injectable()
export class RenameDocumentHandler
  implements ICommandHandler<RenameDocumentCommand, DocumentResponseDto> {
  private readonly logger = new Logger(RenameDocumentHandler.name);

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
    private readonly eventBus: EventBus,
  ) { }

  async execute(command: RenameDocumentCommand): Promise<DocumentResponseDto> {
    const { documentId, newName, userId, userPermissions } = command;

    // 1. Load document
    const doc = await this.repo.findById(documentId);
    if (!doc) throw new DocumentNotFoundError(documentId);

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
      { userId, userPermissions, action: 'write' },
    );

    // 4. Rename via aggregate — invariants enforced inside
    doc.rename(newName);

    // 5. Persist changes
    await this.repo.update(doc.id, doc);

    // MEDIUM-2: Sync the storage object's display name after the DB is committed.
    // renameFile is optional — not all storage backends support a native rename API.
    if (this.storageProvider.renameFile) {
      try {
        await this.storageProvider.renameFile(doc.remotePath, newName, doc.storageOwnerId);
      } catch (err: any) {
        this.logger.warn(
          `[DMS2] Storage rename failed for document ${documentId}: ${err?.message ?? err}. ` +
          `The DB fileName was updated but the storage object display name was not synced.`,
        );
      }
    }

    // 6. Dispatch domain events after successful write
    const events = [...doc.domainEvents];
    doc.clearEvents();
    this.eventBus.publishAll(events);

    return DocumentResponseMapper.toDto(doc);
  }
}
