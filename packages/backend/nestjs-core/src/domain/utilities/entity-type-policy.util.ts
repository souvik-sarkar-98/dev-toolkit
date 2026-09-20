import { EntityAccessDeniedError, EntityTypeForbiddenError } from '../errors/entity-access.errors';

/**
 * Pure, synchronous utility for entity-type allowlist and permission checks.
 * No NestJS or Prisma imports — safe to use in any domain or application layer.
 *
 * Used by comment, dms, and custom-fields handlers to avoid duplicating
 * the same find-or-throw and permission-check logic.
 */
export class EntityTypePolicy {
  /**
   * Finds the config for `entityType` in `allowedTypes`.
   * - Returns `null` when `allowedTypes` is empty/undefined (open — all types permitted).
   * - Throws `EntityTypeForbiddenError` when `entityType` is not in the allowlist.
   *
   * @param modulePrefix Optional prefix for the error code, e.g. 'COMMENT' → 'COMMENT_ENTITY_TYPE_FORBIDDEN'.
   */
  static findConfig<T extends { entityType: string }>(
    entityType: string,
    allowedTypes: T[] | undefined,
    modulePrefix?: string,
  ): T | null {
    if (!allowedTypes?.length) return null;
    const config = allowedTypes.find((c) => c.entityType === entityType);
    if (!config) throw new EntityTypeForbiddenError(entityType, modulePrefix);
    return config;
  }

  /**
   * Asserts the user holds at least one of the `required` permissions.
   * - No-ops when `required` is empty or undefined (no permissions configured).
   * - Throws `EntityAccessDeniedError` when none of the required permissions are present.
   *
   * @param modulePrefix Optional prefix for the error code, e.g. 'DOCUMENT' → 'DOCUMENT_ACCESS_DENIED'.
   */
  static assertHasPermission(
    required: string[] | undefined,
    userPermissions: string[],
    action: string,
    entityType: string,
    modulePrefix?: string,
  ): void {
    if (!required?.length) return;
    const userSet = new Set(userPermissions);
    if (!required.some((p) => userSet.has(p))) {
      throw new EntityAccessDeniedError(action, entityType, undefined, modulePrefix);
    }
  }
}
