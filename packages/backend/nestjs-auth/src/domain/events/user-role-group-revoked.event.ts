import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { UserRoleGroup } from '../aggregates/user-role-group/user-role-group.aggregate';

export type UserRoleGroupRevokedSnapshot = Pick<UserRoleGroup, 'id' | 'idpSub' | 'groupId' | 'ownerId'>;

export class UserRoleGroupRevokedEvent extends DomainEvent<UserRoleGroupRevokedSnapshot> {
  constructor(snapshot: UserRoleGroupRevokedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
