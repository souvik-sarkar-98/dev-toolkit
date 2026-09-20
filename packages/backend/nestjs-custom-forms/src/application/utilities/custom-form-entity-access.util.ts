import {
  EntityTypePolicy,
  EntityRecordAccessPolicy,
  IEntityAccessPort,
} from '@ssdev-toolkit/nestjs-core';
import { CustomFormsModuleOptions } from '../../custom-forms.schema';

const MODULE_PREFIX = 'CUSTOM_FORM';

/**
 * Tier-1 (allowlist + entity-type permissions) and optional tier-2 (record-level port).
 * Skips tier-2 when `entityId` is omitted.
 */
export async function assertCustomFormEntityAccess(
  options: CustomFormsModuleOptions,
  accessPort: IEntityAccessPort | null,
  params: {
    entityType: string;
    entityId?: string;
    userId: string;
    userPermissions: string[];
    action: 'read' | 'write';
  },
): Promise<void> {
  const entityConfig = EntityTypePolicy.findConfig(
    params.entityType,
    options.allowedEntityTypes,
    MODULE_PREFIX,
  );
  EntityTypePolicy.assertHasPermission(
    params.action === 'read' ? entityConfig?.readPermissions : entityConfig?.writePermissions,
    params.userPermissions,
    params.action,
    params.entityType,
    MODULE_PREFIX,
  );

  if (!params.entityId) return;

  await EntityRecordAccessPolicy.assertCanAccess(
    accessPort,
    {
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId,
      userPermissions: params.userPermissions,
      action: params.action,
    },
    MODULE_PREFIX,
  );
}
