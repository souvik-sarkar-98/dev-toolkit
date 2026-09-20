export interface RbacEntityContext {
  entityId: string;
  entityType: string;
}

export interface RbacAccessSnapshot {
  permissions: string[];
  userRoles: string[];
  roleGroups: string[];
}

export interface RbacScopedAccessSnapshot extends RbacAccessSnapshot, RbacEntityContext {}

/** Client-side snapshot of resolved RBAC */
export interface RbacUserAccessSnapshot extends RbacAccessSnapshot {
  idpSub: string;
  userId?: string;
  scopedAccess: RbacScopedAccessSnapshot[];
}

export type CurrentUserRbacDto = {
  idpSub: string;
  userId?: string;
  id?: string;
  permissions?: string[];
  userRoles?: string[];
  roleGroups?: string[];
  scopedAccess?: Array<{
    entityId: string;
    entityType: string;
    permissions?: string[];
    userRoles?: string[];
    roleGroups?: string[];
  }>;
};

export function contextFrom(entityType: string, entityId: string): RbacEntityContext {
  return { entityType, entityId };
}

export function findScopedAccess(
  snapshot: RbacUserAccessSnapshot,
  context: RbacEntityContext,
): RbacScopedAccessSnapshot | undefined {
  return snapshot.scopedAccess.find(
    (scope) => scope.entityId === context.entityId && scope.entityType === context.entityType,
  );
}

function union(global: string[], scoped: string[] | undefined): string[] {
  return [...new Set([...global, ...(scoped ?? [])])];
}

export function effectivePermissions(
  snapshot: RbacUserAccessSnapshot,
  context?: RbacEntityContext,
): string[] {
  if (!context) {
    return [...snapshot.permissions];
  }
  return union(snapshot.permissions, findScopedAccess(snapshot, context)?.permissions);
}

export function effectiveRoles(
  snapshot: RbacUserAccessSnapshot,
  context?: RbacEntityContext,
): string[] {
  if (!context) {
    return [...snapshot.userRoles];
  }
  return union(snapshot.userRoles, findScopedAccess(snapshot, context)?.userRoles);
}

export function effectiveRoleGroups(
  snapshot: RbacUserAccessSnapshot,
  context?: RbacEntityContext,
): string[] {
  if (!context) {
    return [...snapshot.roleGroups];
  }
  return union(snapshot.roleGroups, findScopedAccess(snapshot, context)?.roleGroups);
}

export function snapshotFromCurrentUser(dto: CurrentUserRbacDto): RbacUserAccessSnapshot {
  return {
    idpSub: dto.idpSub,
    userId: dto.userId ?? dto.id,
    permissions: dto.permissions ?? [],
    userRoles: dto.userRoles ?? [],
    roleGroups: dto.roleGroups ?? [],
    scopedAccess: (dto.scopedAccess ?? []).map((scope) => ({
      entityId: scope.entityId,
      entityType: scope.entityType,
      permissions: scope.permissions ?? [],
      userRoles: scope.userRoles ?? [],
      roleGroups: scope.roleGroups ?? [],
    })),
  };
}
