import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { JsonDocument } from '../aggregates/json-document.aggregate';

export interface JsonDocumentFilter {
  namespace?: string;
  key?: string;
}

/**
 * Token naming rule: Symbol name = interface name — one import serves as both
 * the @Inject() token and the TypeScript type annotation.
 */
export const IJsonDocumentRepository = Symbol('IJsonDocumentRepository');

/**
 * Standard CRUD methods (findById, create, update, delete, findAll, findPaged,
 * count) are inherited from IRepository. Only json-store-specific methods are added.
 */
export interface IJsonDocumentRepository
  extends IRepository<JsonDocument, string, JsonDocumentFilter> {
  /**
   * Finds a document by its unique (key, namespace) pair.
   */
  findByKey(key: string, namespace: string): Promise<JsonDocument | null>;

  /**
   * Returns all documents belonging to a given namespace.
   */
  findByNamespace(namespace: string): Promise<JsonDocument[]>;

  /**
   * Atomically creates or updates a document identified by (key, namespace).
   * Returns the persisted document, a flag indicating whether it was newly created,
   * and a `payloadChanged` flag — false when the stored payload was identical to the
   * incoming payload so callers can skip event publication.
   */
  upsertByKey(
    key: string,
    namespace: string,
    payload: Record<string, unknown>,
  ): Promise<{ document: JsonDocument; wasCreated: boolean; payloadChanged: boolean }>;
}
