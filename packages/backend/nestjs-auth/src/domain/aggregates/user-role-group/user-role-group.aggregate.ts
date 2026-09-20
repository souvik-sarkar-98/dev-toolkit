import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { UserRoleGroupGrantedEvent, type UserRoleGroupGrantedSnapshot } from '../../events/user-role-group-granted.event';
import { UserRoleGroupRevokedEvent, type UserRoleGroupRevokedSnapshot } from '../../events/user-role-group-revoked.event';
import { UserRoleGroupAlreadyRevokedError } from '../../errors/auth.errors';

export class UserRoleGroupFilter {
  idpSub?: string;
  groupId?: string;
  ownerId?: string;
  entityId?: string;
  entityType?: string;
  isActive?: boolean;
}

export class UserRoleGroup extends AggregateRoot<string> {
  readonly #idpSub: string;
  #ownerId?: string;
  #entityId?: string;
  #entityType?: string;
  readonly #groupId: string;
  #groupKey?: string;
  readonly #grantedAt: Date;
  #revokedAt?: Date;
  #grantedBy?: string;
  #revokedBy?: string;
  #note?: string;

  constructor(data: {
    id: string;
    idpSub: string;
    ownerId?: string;
    entityId?: string;
    entityType?: string;
    groupId: string;
    groupKey?: string;
    grantedAt: Date;
    revokedAt?: Date;
    grantedBy?: string;
    revokedBy?: string;
    note?: string;
  }) {
    super(data.id);
    this.#idpSub = data.idpSub;
    this.#ownerId = data.ownerId;
    this.#entityId = data.entityId;
    this.#entityType = data.entityType;
    this.#groupId = data.groupId;
    this.#groupKey = data.groupKey;
    this.#grantedAt = data.grantedAt;
    this.#revokedAt = data.revokedAt;
    this.#grantedBy = data.grantedBy;
    this.#revokedBy = data.revokedBy;
    this.#note = data.note;
  }

  static grant(data: {
    idpSub: string;
    groupId: string;
    ownerId?: string;
    entityId?: string;
    entityType?: string;
    grantedBy?: string;
    note?: string;
  }): UserRoleGroup {
    const membership = new UserRoleGroup({
      id: randomUUID(),
      idpSub: data.idpSub,
      ownerId: data.ownerId,
      entityId: data.entityId,
      entityType: data.entityType,
      groupId: data.groupId,
      grantedAt: new Date(),
      grantedBy: data.grantedBy,
      note: data.note,
    });
    membership.addDomainEvent(new UserRoleGroupGrantedEvent(membership.toSnapshot<UserRoleGroupGrantedSnapshot>()));
    return membership;
  }

  revoke(revokedBy: string): void {
    if (this.#revokedAt != null) throw new UserRoleGroupAlreadyRevokedError(this.id);
    this.#revokedAt = new Date();
    this.#revokedBy = revokedBy;
    this.touch();
    this.addDomainEvent(new UserRoleGroupRevokedEvent(this.toSnapshot<UserRoleGroupRevokedSnapshot>()));
  }

  isActive(): boolean {
    return this.#revokedAt === undefined || this.#revokedAt === null;
  }

  get idpSub(): string { return this.#idpSub; }
  get ownerId(): string | undefined { return this.#ownerId; }
  get entityId(): string | undefined { return this.#entityId; }
  get entityType(): string | undefined { return this.#entityType; }
  get groupId(): string { return this.#groupId; }
  get groupKey(): string | undefined { return this.#groupKey; }
  get grantedAt(): Date { return this.#grantedAt; }
  get revokedAt(): Date | undefined { return this.#revokedAt; }
  get grantedBy(): string | undefined { return this.#grantedBy; }
  get revokedBy(): string | undefined { return this.#revokedBy; }
  get note(): string | undefined { return this.#note; }
}
