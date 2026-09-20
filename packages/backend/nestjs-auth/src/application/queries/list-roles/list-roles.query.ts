import { BaseFilter } from '@ssdev-toolkit/nestjs-core';
import { RoleFilter } from '../../../domain/aggregates/role/role.aggregate';

export class ListRolesQuery {
  constructor(public readonly filter?: BaseFilter<RoleFilter>) { }
}
