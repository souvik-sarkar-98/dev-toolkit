import { IRepository } from '@ssdev-toolkit/nestjs-core';
import {
  UserPermission,
  UserPermissionFilter,
} from '../aggregates/user-permission/user-permission.aggregate';

export const IUserPermissionRepository = Symbol('IUserPermissionRepository');

export interface DirectUserPermissionView {
  permissionKey: string;
  ownerId?: string;
  entityId?: string;
  entityType?: string;
}

export interface IUserPermissionRepository
  extends IRepository<UserPermission, string, UserPermissionFilter> {
  findActiveByIdPSub(idpSub: string): Promise<UserPermission[]>;
  resolveDirectUserPermissions(idpSub: string): Promise<DirectUserPermissionView[]>;
}
