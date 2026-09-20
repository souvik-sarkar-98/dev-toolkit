export const ICommentEntityAccessPort = Symbol('ICommentEntityAccessPort');

/**
 * Optional port for record-level (entity-instance) access checks.
 * Consumers implement `IEntityAccessPort` from `@ssdev-toolkit/nestjs-core`
 * when a permission check alone is not sufficient — e.g. checking that the user
 * is a member of the specific donation/task.
 *
 * Registration is optional — handlers use @Optional() @Inject(ICommentEntityAccessPort).
 * If no provider is registered, record-level checks are skipped (permission-based
 * tier still applies via EntityTypePolicy).
 *
 * @example
 * import { IEntityAccessPort } from '@ssdev-toolkit/nestjs-core';
 * import { ICommentEntityAccessPort } from '@ssdev-toolkit/nestjs-comment';
 *
 * @Injectable()
 * export class CommentEntityAccessAdapter implements IEntityAccessPort {
 *   async canAccess({ entityType, entityId, userId, userPermissions, action }) {
 *     switch (entityType) {
 *       case 'donation': return this.donations.canUserAccess(entityId!, userId, action);
 *       case 'task':     return this.tasks.canUserAccess(entityId!, userId, action);
 *       default:         return false;
 *     }
 *   }
 * }
 *
 * // { provide: ICommentEntityAccessPort, useClass: CommentEntityAccessAdapter }
 */
