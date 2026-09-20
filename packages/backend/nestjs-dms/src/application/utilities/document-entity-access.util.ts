import {
  EntityAccessDeniedError,
  EntityTypePolicy,
  EntityTypeForbiddenError,
  EntityRecordAccessPolicy,
  IEntityAccessPort,
} from '@ssdev-toolkit/nestjs-core';
import { DocumentAccessDeniedError } from '../../domain/errors/document.errors';
import { DmsModuleOptions, EntityTypeConfig } from '../../dms.schema';

const MODULE_PREFIX = 'DOCUMENT';

/**
 * Tier-1 (allowlist + entity-type permissions) and optional tier-2 (record-level port).
 * Skips tier-2 when `entityId` is omitted.
 */
export async function assertDocumentEntityAccess(
  options: DmsModuleOptions,
  accessPort: IEntityAccessPort | null | undefined,
  params: {
    entityType: string;
    entityId?: string;
    userId: string;
    userPermissions: string[];
    action: 'read' | 'write';
  },
): Promise<EntityTypeConfig | null> {
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

  if (params.entityId) {
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

  return entityConfig;
}

/**
 * Any-passes: grants access when at least one target passes tier-1 + tier-2.
 * No-ops when `targets` is empty (e.g. mapping-free documents).
 */
export async function assertDocumentEntityAccessAny(
  options: DmsModuleOptions,
  accessPort: IEntityAccessPort | null | undefined,
  targets: Array<{ entityType: string; entityId: string }>,
  params: {
    userId: string;
    userPermissions: string[];
    action: 'read' | 'write';
  },
): Promise<void> {
  if (!targets.length) return;

  for (const target of targets) {
    try {
      await assertDocumentEntityAccess(options, accessPort, {
        ...params,
        entityType: target.entityType,
        entityId: target.entityId,
      });
      return;
    } catch (err) {
      if (err instanceof EntityTypeForbiddenError || err instanceof EntityAccessDeniedError) {
        continue;
      }
      throw err;
    }
  }

  const first = targets[0];
  throw new DocumentAccessDeniedError(params.action, first.entityType, first.entityId);
}
