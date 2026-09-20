import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { Role, RoleFilter } from '../aggregates/role/role.aggregate';

export const IRoleRepository = Symbol('IRoleRepository');

export interface IRoleRepository extends IRepository<Role, string, RoleFilter> {
  findByKey(key: string): Promise<Role | null>;
  findByKeys(keys: string[]): Promise<Role[]>;
  findWithPermissions(key: string): Promise<Role | null>;
  findWithPermissionsById(id: string): Promise<Role | null>;
  syncPermissions(roleId: string, permissionIds: string[]): Promise<void>;
  /** Active roles that still reference this permission. */
  countActiveByPermissionId(permissionId: string): Promise<number>;
}
