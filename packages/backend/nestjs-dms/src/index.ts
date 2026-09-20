// Module
export { DmsModule as DmsModule } from './dms.module';
export type { DmsModuleOptions as DmsModuleOptions } from './dms.schema';
export type { EntityTypeConfig as DmsEntityTypeConfig } from './dms.schema';

// Tokens — **host persistence / infrastructure wiring only** (`apps/*/shared/persistence`).
// Cross-module document access: use DmsFacade (bus-only), not IDocumentRepository.
export { DMS2_OPTIONS as DMS_OPTIONS } from './infrastructure/dms-options.token';
export { IDocumentRepository } from './domain/repositories/document.repository';
export type { DocumentFilter } from './domain/repositories/document.repository';
export { IStorageProvider } from './domain/ports/storage.port';
export type {
  StorageUploadParams,
  StorageUploadResult,
} from './domain/ports/storage.port';
export { IDocumentEntityAccessPort } from './domain/ports/entity-access.port';

// DTOs (for consumers who use DMS responses)
export { DocumentResponseDto, DocumentMappingDto } from './presentation/dtos/document-response.dto';

// Facade (cross-module integration — writes and reads via bus)
export { DmsFacade } from './application/services/dms.facade';
export { DownloadDocumentQuery } from './application/queries/download-document/download-document.query';

