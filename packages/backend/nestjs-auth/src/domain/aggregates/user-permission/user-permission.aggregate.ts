import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import {
  UserPermissionGrantedEvent,
  type UserPermissionGrantedSnapshot,
} from '../../events/user-permission-granted.event';
import {
  UserPermissionRevokedEvent,
  type UserPermissionRevokedSnapshot,
} from '../../events/user-permission-revoked.event';
import { UserPermissionAlreadyRevokedError } from '../../errors/auth.errors';

export class UserPermissionFilter {
  idpSub?: string;
  permissionId?: string;
  ownerId?: string;
  entityId?: string;
  entityType?: string;
  isActive?: boolean;
}

export class UserPermission extends AggregateRoot<string> {
  readonly #idpSub: string;
  #ownerId?: string;
  #entityId?: string;
  #entityType?: string;
  readonly #permissionId: string;
  #permissionKey?: string;
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
    permissionId: string;
    permissionKey?: string;
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
    this.#permissionId = data.permissionId;
    this.#permissionKey = data.permissionKey;
    this.#grantedAt = data.grantedAt;
    this.#revokedAt = data.revokedAt;
    this.#grantedBy = data.grantedBy;
    this.#revokedBy = data.revokedBy;
    this.#note = data.note;
  }

  static grant(data: {
    idpSub: string;
    permissionId: string;
    ownerId?: string;
    entityId?: string;
    entityType?: string;
    grantedBy?: string;
    note?: string;
  }): UserPermission {
    const grant = new UserPermission({
      id: randomUUID(),
      idpSub: data.idpSub,
      ownerId: data.ownerId,
      entityId: data.entityId,
      entityType: data.entityType,
      permissionId: data.permissionId,
      grantedAt: new Date(),
      grantedBy: data.grantedBy,
      note: data.note,
    });
    grant.addDomainEvent(
      new UserPermissionGrantedEvent(grant.toSnapshot<UserPermissionGrantedSnapshot>()),
    );
    return grant;
  }

  revoke(revokedBy: string): void {
    if (this.#revokedAt != null) throw new UserPermissionAlreadyRevokedError(this.id);
    this.#revokedAt = new Date();
    this.#revokedBy = revokedBy;
    this.touch();
    this.addDomainEvent(
      new UserPermissionRevokedEvent(this.toSnapshot<UserPermissionRevokedSnapshot>()),
    );
  }

  isActive(): boolean {
    return this.#revokedAt === undefined || this.#revokedAt === null;
  }

  get idpSub(): string { return this.#idpSub; }
  get ownerId(): string | undefined { return this.#ownerId; }
  get entityId(): string | undefined { return this.#entityId; }
  get entityType(): string | undefined { return this.#entityType; }
  get permissionId(): string { return this.#permissionId; }
  get permissionKey(): string | undefined { return this.#permissionKey; }
  get grantedAt(): Date { return this.#grantedAt; }
  get revokedAt(): Date | undefined { return this.#revokedAt; }
  get grantedBy(): string | undefined { return this.#grantedBy; }
  get revokedBy(): string | undefined { return this.#revokedBy; }
  get note(): string | undefined { return this.#note; }
}
