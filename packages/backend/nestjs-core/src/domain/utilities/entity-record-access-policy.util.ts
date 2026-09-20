import { EntityAccessDeniedError } from '../errors/entity-access.errors';
import { IEntityAccessPort } from '../ports/entity-access.port';

/**
 * Async policy for record-level (entity-instance) access checks via an optional port.
 * No NestJS or Prisma imports — safe to use in any application handler.
 *
 * Pairs with {@link EntityTypePolicy} (tier-1 allowlist + permissions).
 *
 * @example
 * await EntityRecordAccessPolicy.assertCanAccess(
 *   this.accessPort,
 *   { entityType, entityId, userId, userPermissions, action: 'read' },
 *   'COMMENT',
 * );
 */
export class EntityRecordAccessPolicy {
  /**
   * Asserts record-level access via the optional port.
   * - No-ops when `accessPort` is null or undefined (fail-open; tier-1 still applies).
   * - Throws `EntityAccessDeniedError` when `canAccess()` returns false.
   *
   * @param modulePrefix Optional prefix for the error code, e.g. 'COMMENT' → 'COMMENT_ACCESS_DENIED'.
   */
  static async assertCanAccess(
    accessPort: IEntityAccessPort | null | undefined,
    params: {
      entityType: string;
      entityId?: string;
      userId: string;
      userPermissions: string[];
      action: string;
    },
    modulePrefix?: string,
  ): Promise<void> {
    if (!accessPort) return;
    const allowed = await accessPort.canAccess(params);
    if (!allowed) {
      throw new EntityAccessDeniedError(params.action, params.entityType, params.entityId, modulePrefix);
    }
  }
}
