import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { UserRoleGrantedEvent, type UserRoleGrantedSnapshot } from '../../events/user-role-granted.event';
import { UserRoleRevokedEvent, type UserRoleRevokedSnapshot } from '../../events/user-role-revoked.event';
import { UserRoleAlreadyRevokedError } from '../../errors/auth.errors';

export class UserRoleFilter {
  idpSub?: string;
  roleId?: string;
  ownerId?: string;
  entityId?: string;
  entityType?: string;
  isActive?: boolean;
  sourceGroupId?: string;
}

export class UserRole extends AggregateRoot<string> {
  readonly #idpSub: string;
  #ownerId?: string;
  #entityId?: string;
  #entityType?: string;
  readonly #roleId: string;
  #roleKey?: string;
  #sourceGroupId?: string;
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
    roleId: string;
    roleKey?: string;
    sourceGroupId?: string;
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
    this.#roleId = data.roleId;
    this.#roleKey = data.roleKey;
    this.#sourceGroupId = data.sourceGroupId;
    this.#grantedAt = data.grantedAt;
    this.#revokedAt = data.revokedAt;
    this.#grantedBy = data.grantedBy;
    this.#revokedBy = data.revokedBy;
    this.#note = data.note;
  }

  static grant(data: {
    idpSub: string;
    roleId: string;
    ownerId?: string;
    entityId?: string;
    entityType?: string;
    sourceGroupId?: string;
    grantedBy?: string;
    note?: string;
  }): UserRole {
    const userRole = new UserRole({
      id: randomUUID(),
      idpSub: data.idpSub,
      ownerId: data.ownerId,
      entityId: data.entityId,
      entityType: data.entityType,
      roleId: data.roleId,
      sourceGroupId: data.sourceGroupId,
      grantedAt: new Date(),
      grantedBy: data.grantedBy,
      note: data.note,
    });
    userRole.addDomainEvent(new UserRoleGrantedEvent(userRole.toSnapshot<UserRoleGrantedSnapshot>()));
    return userRole;
  }

  revoke(revokedBy: string): void {
    if (this.#revokedAt != null) throw new UserRoleAlreadyRevokedError(this.id);
    this.#revokedAt = new Date();
    this.#revokedBy = revokedBy;
    this.touch();
    this.addDomainEvent(new UserRoleRevokedEvent(this.toSnapshot<UserRoleRevokedSnapshot>()));
  }

  isActive(): boolean {
    return this.#revokedAt === undefined || this.#revokedAt === null;
  }

  get idpSub(): string { return this.#idpSub; }
  get ownerId(): string | undefined { return this.#ownerId; }
  get entityId(): string | undefined { return this.#entityId; }
  get entityType(): string | undefined { return this.#entityType; }
  get roleId(): string { return this.#roleId; }
  get roleKey(): string | undefined { return this.#roleKey; }
  get sourceGroupId(): string | undefined { return this.#sourceGroupId; }
  get grantedAt(): Date { return this.#grantedAt; }
  get revokedAt(): Date | undefined { return this.#revokedAt; }
  get grantedBy(): string | undefined { return this.#grantedBy; }
  get revokedBy(): string | undefined { return this.#revokedBy; }
  get note(): string | undefined { return this.#note; }
}
