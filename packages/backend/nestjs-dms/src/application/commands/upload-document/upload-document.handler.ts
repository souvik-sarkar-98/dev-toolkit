import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
import { Document } from '../../../domain/aggregates/document.aggregate';
import { DocumentMapping } from '../../../domain/entities/document-mapping.entity';
import { DocumentVisibility } from '../../../domain/enums/document-visibility.enum';
import { MimeTypeNotAllowedError } from '../../../domain/errors/document.errors';
import { DocumentUploadPolicy } from '../../../domain/policies/document-upload.policy';
import { IDocumentEntityAccessPort } from '../../../domain/ports/entity-access.port';
import { IStorageProvider } from '../../../domain/ports/storage.port';
import { IDocumentRepository } from '../../../domain/repositories/document.repository';
import { DMS2_OPTIONS } from '../../../infrastructure/dms-options.application-token';
import { DmsModuleOptions, EntityTypeConfig } from '../../../dms.schema';
import { DocumentResponseDto } from '../../../presentation/dtos/document-response.dto';
import { DocumentResponseMapper } from '../../mappers/document-response.mapper';
import { assertDocumentEntityAccess } from '../../utilities/document-entity-access.util';
import { UploadDocumentCommand } from './upload-document.command';

// HIGH-2: TODO — Install the `file-type` npm package (`npm i file-type`) and call
// `fileTypeFromBuffer(fileBuffer)` to detect the actual MIME type from file content.
// Compare the detected type against the declared contentType AND against allowedMimeTypes.
// If they mismatch or the detected type is blocked, throw MimeTypeNotAllowedError.
// Relying solely on the client-declared contentType allows trivial MIME-spoofing attacks.
//
// Until then, the magic-byte checks below block the most dangerous executable formats.
const BLOCKED_MAGIC_PREFIXES: ReadonlyArray<{ label: string; bytes: readonly number[] }> = [
  { label: 'Windows PE executable (.exe/.dll/.sys)', bytes: [0x4d, 0x5a] }, // MZ header
  { label: 'ELF binary (Linux/Unix executable)', bytes: [0x7f, 0x45, 0x4c, 0x46] }, // \x7FELF
  { label: 'Unix script with shebang (#!)', bytes: [0x23, 0x21] }, // #!
];

function detectBlockedMagicBytes(buf: Buffer): string | null {
  for (const { label, bytes } of BLOCKED_MAGIC_PREFIXES) {
    if (buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b)) {
      return label;
    }
  }
  return null;
}

@CommandHandler(UploadDocumentCommand)
@Injectable()
export class UploadDocumentHandler
  implements ICommandHandler<UploadDocumentCommand, DocumentResponseDto> {
  private readonly logger = new Logger(UploadDocumentHandler.name);

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

  async execute(command: UploadDocumentCommand): Promise<DocumentResponseDto> {
    const {
      fileBuffer,
      fileName,
      contentType,
      mappings,
      visibility,
      userId,
      userPermissions,
      storageOwnerId,
    } = command;

    // 1. Allowlist + permission check per mapping
    const configs: (EntityTypeConfig | null)[] = await Promise.all(
      mappings.map((m) =>
        assertDocumentEntityAccess(this.options, this.accessPort, {
          entityType: m.entityType,
          userId,
          userPermissions,
          action: 'write',
        }),
      ),
    );

    // 2. Upload policy: file size and declared MIME type
    DocumentUploadPolicy.assertSizeAllowed(fileBuffer.length, this.options.maxFileSizeMb);
    DocumentUploadPolicy.assertMimeAllowed(contentType, this.options.allowedMimeTypes);

    // HIGH-2: Magic-byte check — block known dangerous executable types regardless of
    // declared contentType. Replace with `file-type` package for full MIME detection.
    const blockedLabel = detectBlockedMagicBytes(fileBuffer);
    if (blockedLabel) {
      throw new MimeTypeNotAllowedError(
        `${contentType} (blocked: file content matches ${blockedLabel})`,
      );
    }

    // 3. Per-entity document count cap
    // HIGH-4: TOCTOU race — countByEntity → check → upload is not atomic; concurrent
    // uploads can exceed the limit. Proper fix: wrap the count + insert in a DB transaction
    // with SELECT FOR UPDATE, or enforce the limit with a unique partial index on the
    // mappings table. The post-insert re-check at step 9 provides a best-effort guard
    // but does NOT prevent races under high concurrency.
    for (let i = 0; i < mappings.length; i++) {
      const m = mappings[i];
      const config = configs[i];
      if (config?.maxDocumentsPerEntity !== undefined) {
        const count = await this.repo.countByEntity(m.entityType, m.entityId);
        DocumentUploadPolicy.assertLimitNotReached(count, m.entityType, m.entityId, config.maxDocumentsPerEntity);
      }
    }

    // CRITICAL-2: Warn when access port not configured but mappings exist (record-level
    // entity auth will be bypassed for this upload)
    if (!this.accessPort && mappings.length > 0) {
      this.logger.warn(
        `[DMS2] IDocumentEntityAccessPort is not configured — record-level entity access check ` +
        `is BYPASSED for upload by user ${userId}. Register an IEntityAccessPort adapter on ` +
        `IDocumentEntityAccessPort to enable entity-level access control.`,
      );
    }

    // 4. Optional record-level access check (write) — all mappings must pass
    for (const m of mappings) {
      await assertDocumentEntityAccess(this.options, this.accessPort, {
        entityType: m.entityType,
        entityId: m.entityId,
        userId,
        userPermissions,
        action: 'write',
      });
    }

    // MEDIUM-3: Sanitize fileName before embedding in the storage key to prevent path
    // injection (e.g. ../../../etc/passwd, null bytes, overlong names).
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

    // 5. Upload to storage
    const accessToken = randomUUID();
    const result = await this.storageProvider.uploadFile({
      path: `uploads/${randomUUID()}-${safeName}`,
      contentType,
      token: accessToken,
      content: fileBuffer,
      ownerId: storageOwnerId,
    });

    // 6. Build mapping entities
    const mappedTo: DocumentMapping[] = mappings.map((m) =>
      DocumentMapping.create({ refId: m.entityId, refType: m.entityType }),
    );

    // 7. Create aggregate
    const document = Document.create({
      fileName,
      contentType,
      fileSize: fileBuffer.length,
      remotePath: result.remotePath,
      publicToken: accessToken,
      mappedTo,
      visibility: visibility as DocumentVisibility,
      uploadedById: userId,
      storageOwnerId,
    });

    // 8. Persist — HIGH-1: compensating storage delete if DB insert fails to avoid
    //    permanently orphaned storage blobs.
    try {
      await this.repo.create(document);
    } catch (dbError) {
      try {
        await this.storageProvider.deleteFile(result.remotePath, storageOwnerId);
      } catch (deleteError: any) {
        // Compensating delete failed — the blob is now orphaned. Log for manual cleanup.
        this.logger.error(
          `[DMS2] DB insert failed AND compensating storage delete also failed. ` +
          `Orphaned storage object: "${result.remotePath}". Manual cleanup required. ` +
          `Delete error: ${deleteError?.message ?? deleteError}`,
        );
      }
      throw dbError;
    }

    // 9. HIGH-4: Post-insert count re-check (best-effort TOCTOU guard).
    // If a concurrent upload slipped past the pre-check, roll back by soft-deleting
    // the just-created document and removing its storage object.
    for (let i = 0; i < mappings.length; i++) {
      const m = mappings[i];
      const config = configs[i];
      if (config?.maxDocumentsPerEntity !== undefined) {
        const countAfter = await this.repo.countByEntity(m.entityType, m.entityId);
        if (countAfter > config.maxDocumentsPerEntity) {
          try {
            document.softDelete();
            await this.repo.update(document.id, document);
            await this.storageProvider.deleteFile(result.remotePath, storageOwnerId);
          } catch (rollbackError: any) {
            this.logger.error(
              `[DMS2] Document limit exceeded (TOCTOU race) and rollback failed for ` +
              `document ${document.id}. Manual cleanup required. ` +
              `Rollback error: ${rollbackError?.message ?? rollbackError}`,
            );
          }
          DocumentUploadPolicy.assertLimitNotReached(
            countAfter,
            m.entityType,
            m.entityId,
            config.maxDocumentsPerEntity,
          );
        }
      }
    }

    // 10. Dispatch domain events after successful write
    const events = [...document.domainEvents];
    document.clearEvents();
    this.eventBus.publishAll(events);

    return DocumentResponseMapper.toDto(document);
  }
}
