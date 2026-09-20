import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Document } from '../aggregates/document.aggregate';

export interface DocumentFilter {
  refType?: string;
  refId?: string;
  uploadedById?: string;
}

/**
 * Token naming rule: Symbol name = interface name — one import serves as both
 * the @Inject() token and the TypeScript type annotation.
 */
export const IDocumentRepository = Symbol('IDocumentRepository');

/**
 * Standard CRUD methods (findById, findAll, findPaged, create, update, delete, count)
 * are inherited from IRepository. Only document-specific methods are added here.
 */
export interface IDocumentRepository extends IRepository<Document, string, DocumentFilter> {
  findAllByEntity(entityType: string, entityId: string): Promise<Document[]>;
  countByEntity(entityType: string, entityId: string): Promise<number>;
}
