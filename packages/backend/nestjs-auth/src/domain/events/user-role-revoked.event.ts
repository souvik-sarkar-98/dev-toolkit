import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { UserRole } from '../aggregates/user-role/user-role.aggregate';

export type UserRoleRevokedSnapshot = Pick<UserRole, 'id' | 'idpSub' | 'roleId' | 'ownerId'>;

export class UserRoleRevokedEvent extends DomainEvent<UserRoleRevokedSnapshot> {
  constructor(snapshot: UserRoleRevokedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
