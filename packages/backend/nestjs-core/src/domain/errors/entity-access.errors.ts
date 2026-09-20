import { BusinessError } from './business-error';

/**
 * Thrown when the requested entityType is not in the configured allowlist.
 *
 * Pass `modulePrefix` to produce a module-specific error code:
 *   'COMMENT'      → 'COMMENT_ENTITY_TYPE_FORBIDDEN'
 *   'DOCUMENT'     → 'DOCUMENT_ENTITY_TYPE_FORBIDDEN'
 *   'CUSTOM_FIELD' → 'CUSTOM_FIELD_ENTITY_TYPE_FORBIDDEN'
 *   undefined      → 'ENTITY_TYPE_FORBIDDEN'
 */
export class EntityTypeForbiddenError extends BusinessError {
  constructor(entityType: string, modulePrefix?: string) {
    const prefix = modulePrefix ? `${modulePrefix}_` : '';
    const code = `${prefix}ENTITY_TYPE_FORBIDDEN`;
    const label = modulePrefix ? modulePrefix.toLowerCase().replace(/_/g, ' ') : 'module';
    super(
      `entityType "${entityType}" is not registered with the ${label} module`,
      code,
      403,
    );
  }
}

/**
 * Thrown when a user lacks the required permissions or record-level access.
 *
 * Pass `modulePrefix` to produce a module-specific error code:
 *   'COMMENT'      → 'COMMENT_ACCESS_DENIED'
 *   'DOCUMENT'     → 'DOCUMENT_ACCESS_DENIED'
 *   'CUSTOM_FIELD' → 'CUSTOM_FIELD_ACCESS_DENIED'
 *   undefined      → 'ENTITY_ACCESS_DENIED'
 */
export class EntityAccessDeniedError extends BusinessError {
  constructor(action: string, entityType: string, entityId?: string, modulePrefix?: string) {
    const prefix = modulePrefix ? `${modulePrefix}_` : 'ENTITY_';
    const code = `${prefix}ACCESS_DENIED`;
    const location = entityId ? `${entityType}/${entityId}` : entityType;
    super(`No ${action} access on ${location}`, code, 403);
  }
}
