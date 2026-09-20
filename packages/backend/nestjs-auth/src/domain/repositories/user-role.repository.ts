import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { UserRole, UserRoleFilter } from '../aggregates/user-role/user-role.aggregate';

export const IUserRoleRepository = Symbol('IUserRoleRepository');

export interface DirectRolePermissionView {
  roleKey: string;
  permissionKeys: string[];
  ownerId?: string;
  entityId?: string;
  entityType?: string;
}

export interface IUserRoleRepository extends IRepository<UserRole, string, UserRoleFilter> {
  findActiveByIdPSub(idpSub: string): Promise<UserRole[]>;
  resolveDirectPermissions(idpSub: string): Promise<DirectRolePermissionView[]>;
  bulkCreate(userRoles: UserRole[]): Promise<void>;
  revokeSourcedRoles(idpSub: string, sourceGroupId: string, revokedBy?: string): Promise<void>;
  /** Returns idpSubs of all users with this role directly assigned (active, not revoked). */
  findIdPSubsByRoleKey(roleKey: string): Promise<string[]>;
}
