import { EntityTypePolicy } from '@ssdev-toolkit/nestjs-core';
import type { ResourceTypeConfig } from '../../correspondence.schema';

const MODULE_PREFIX = 'CORRESPONDENCE';

/**
 * Tier-1 allowlist for resource subscriptions.
 * - Empty / omitted allowlist → open (any resourceType permitted).
 * - Non-empty → only listed resource types may be subscribed to.
 */
export function assertResourceTypeAllowed(
  resourceType: string,
  allowedResourceTypes: ResourceTypeConfig[] | undefined,
): ResourceTypeConfig | null {
  const mapped = allowedResourceTypes?.map((c) => ({
    entityType: c.resourceType,
    subscribePermissions: c.subscribePermissions,
  }));
  const found = EntityTypePolicy.findConfig(resourceType, mapped, MODULE_PREFIX);
  if (!found) return null;
  return {
    resourceType: found.entityType,
    subscribePermissions: found.subscribePermissions,
  };
}
