import { DomainEvent } from '@ssdev-toolkit/nestjs-core';
import type { UserPermission } from '../aggregates/user-permission/user-permission.aggregate';

export type UserPermissionRevokedSnapshot = Pick<
  UserPermission,
  'id' | 'idpSub' | 'permissionId' | 'ownerId'
>;

export class UserPermissionRevokedEvent extends DomainEvent<UserPermissionRevokedSnapshot> {
  constructor(snapshot: UserPermissionRevokedSnapshot) {
    super(snapshot.id, snapshot);
  }
}
