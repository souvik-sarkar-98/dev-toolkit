import { IRepository } from '@ssdev-toolkit/nestjs-core';
import { RoleGroup, RoleGroupFilter } from '../aggregates/role-group/role-group.aggregate';

export const IRoleGroupRepository = Symbol('IRoleGroupRepository');

export interface IRoleGroupRepository extends IRepository<RoleGroup, string, RoleGroupFilter> {
  findByKey(key: string): Promise<RoleGroup | null>;
  findWithRoles(key: string): Promise<RoleGroup | null>;
  findWithRolesById(id: string): Promise<RoleGroup | null>;
  syncRoles(groupId: string, roleIds: string[]): Promise<void>;
  /** Active groups that still include this role. */
  countActiveByRoleId(roleId: string): Promise<number>;
}
