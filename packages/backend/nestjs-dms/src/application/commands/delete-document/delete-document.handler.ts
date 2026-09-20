import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { DocumentNotFoundError } from '../../../domain/errors/document.errors';
import { IDocumentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IStorageProvider } from '../../../domain/ports/storage.port';
import { IDocumentRepository } from '../../../domain/repositories/document.repository';
import { DMS2_OPTIONS } from '../../../infrastructure/dms-options.application-token';
import { DmsModuleOptions } from '../../../dms.schema';
import { assertDocumentEntityAccessAny } from '../../utilities/document-entity-access.util';
import { DeleteDocumentCommand } from './delete-document.command';

@CommandHandler(DeleteDocumentCommand)
@Injectable()
export class DeleteDocumentHandler implements ICommandHandler<DeleteDocumentCommand, void> {
  private readonly logger = new Logger(DeleteDocumentHandler.name);

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

  async execute(command: DeleteDocumentCommand): Promise<void> {
    const { documentId, userId, userPermissions } = command;

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

    // 4. Soft-delete aggregate
    doc.softDelete();

    // 5. Persist soft-delete first — if storage deletion fails, the document is
    //    invisible to users (soft-deleted in DB) but the blob is recoverable.
    await this.repo.update(doc.id, doc);

    // 6. Remove from storage after DB is committed
    await this.storageProvider.deleteFile(doc.remotePath, doc.storageOwnerId);

    // 7. Dispatch domain events after successful write
    const events = [...doc.domainEvents];
    doc.clearEvents();
    this.eventBus.publishAll(events);
  }
}
