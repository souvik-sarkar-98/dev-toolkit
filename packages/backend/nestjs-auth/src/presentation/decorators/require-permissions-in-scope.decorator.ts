import { SetMetadata } from '@nestjs/common';

export interface ScopeSource {
  /** Where to read the entity ID from on the incoming request */
  from: 'params' | 'headers' | 'query';
  /** Key to look up in request[from] to get the entityId */
  entityIdKey: string;
  /**
   * Key to look up in request[from] to get the entityType dynamically.
   * Mutually exclusive with entityTypeValue.
   */
  entityTypeKey?: string;
  /**
   * Fixed entity type to use (e.g. always "project").
   * Used when the entityType is known at route-definition time.
   * Mutually exclusive with entityTypeKey.
   */
  entityTypeValue?: string;
}

export interface RequirePermissionsInScopeMeta {
  scope: ScopeSource;
  permissions: string[];
}

export const REQUIRE_PERMISSIONS_IN_SCOPE_KEY = 'requirePermissionsInScope';

/**
 * Requires that the authenticated user holds all specified permissions
 * either globally or within the entity scope resolved from the request.
 *
 * @example
 * // entityType is fixed, entityId comes from :projectId route param
 * @RequirePermissionsInScope(
 *   { from: 'params', entityIdKey: 'projectId', entityTypeValue: 'project' },
 *   'read:projects',
 * )
 */
export const RequirePermissionsInScope = (
  scope: ScopeSource,
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata<string, RequirePermissionsInScopeMeta>(REQUIRE_PERMISSIONS_IN_SCOPE_KEY, {
    scope,
    permissions,
  });
