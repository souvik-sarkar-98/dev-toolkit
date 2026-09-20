import { BaseFilter } from '@ssdev-toolkit/nestjs-core';
import { RoleGroupFilter } from '../../../domain/aggregates/role-group/role-group.aggregate';

export class ListRoleGroupsQuery {
  constructor(public readonly filter?: BaseFilter<RoleGroupFilter>) { }
}
