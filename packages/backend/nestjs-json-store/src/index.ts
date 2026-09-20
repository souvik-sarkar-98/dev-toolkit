// Module
export { JsonStoreModule } from './json-store.module';
export { JsonStoreModuleOptions, DEFAULT_JSON_STORE_CACHE_TTL_MS } from './json-store.schema';

// Domain — errors
export {
  JsonDocumentNotFoundError,
  JsonDocumentKeyNotFoundError,
  JsonDocumentAlreadyExistsError,
  JsonDocumentInvalidError,
} from './domain/errors/json-store.errors';

// Domain — repository interface — **host persistence only**.
// Programmatic access: JsonStoreFacade.
export {
  IJsonDocumentRepository,
  JsonDocumentFilter,
} from './domain/repositories/json-document.repository';

// Domain — optional write-time payload validator port
export {
  IJsonDocumentPayloadValidatorPort,
} from './domain/ports/json-document-payload-validator.port';
export { NoOpJsonDocumentPayloadValidator } from './domain/ports/no-op-json-document-payload-validator';

// Application — facade (primary programmatic entry point)
export { JsonStoreFacade } from './application/services/json-store.facade';

// Application — DTOs
export {
  CreateJsonDocumentDto,
  UpdateJsonDocumentDto,
  UpsertJsonDocumentDto,
  ListJsonDocumentsQueryDto,
  JsonDocumentResponseDto,
} from './application/dtos/json-document.dtos';
