export const IDocumentEntityAccessPort = Symbol('IDocumentEntityAccessPort');

/**
 * Optional port for record-level (entity-instance) access checks.
 * Consumers implement `IEntityAccessPort` from `@ssdev-toolkit/nestjs-core`
 * when a permission check alone is not sufficient — e.g. checking that the user
 * is a member of the specific entity.
 *
 * Registration is optional — handlers use @Optional() @Inject(IDocumentEntityAccessPort).
 * If no provider is registered, record-level checks are skipped (permission-based
 * tier still applies via EntityTypePolicy).
 *
 * @example
 * import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
 * import { IDocumentEntityAccessPort } from '@ssdev-toolkit/nestjs-dms';
 *
 * @Injectable()
 * export class DocumentEntityAccessAdapter implements IEntityAccessPort {
 *   async canAccess({ entityType, entityId, userId, userPermissions, action }) {
 *     switch (entityType) {
 *       case 'donation': return this.donations.canUserAccess(entityId!, userId, action);
 *       default:         return false;
 *     }
 *   }
 * }
 *
 * // { provide: IDocumentEntityAccessPort, useClass: DocumentEntityAccessAdapter }
 */
