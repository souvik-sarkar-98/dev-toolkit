import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { AggregateRoot, hashText } from '@ssdev-toolkit/nestjs-core';
import { ApiKeyCreatedEvent, type ApiKeyCreatedSnapshot } from '../../events/api-key-created.event';
import { ApiKeyUsedEvent, type ApiKeyUsedSnapshot } from '../../events/api-key-used.event';
import { ApiKeyRevokedEvent, type ApiKeyRevokedSnapshot } from '../../events/api-key-revoked.event';
import { ApiKeyPermissionsUpdatedEvent, type ApiKeyPermissionsUpdatedSnapshot } from '../../events/api-key-permissions-updated.event';
import { ApiKeyExpiredError } from '../../errors/auth.errors';

export class ApiKeyFilter {
  name?: string;
  permissions?: string[];
  ownerId?: string;
}

export class ApiKey extends AggregateRoot<string> {
  readonly #key: string;
  #name: string;
  #keyId: string;
  #permissions: string[];
  #expiresAt?: Date;
  #lastUsedAt?: Date;
  #createdBy?: string;
  #ownerId?: string;

  constructor(data: {
    id: string;
    key: string;
    keyId: string;
    name: string;
    permissions: string[];
    expiresAt?: Date;
    lastUsedAt?: Date;
    createdBy?: string;
    ownerId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this.#key = data.key;
    this.#keyId = data.keyId;
    this.#name = data.name;
    this.#permissions = data.permissions;
    this.#expiresAt = data.expiresAt;
    this.#lastUsedAt = data.lastUsedAt;
    this.#createdBy = data.createdBy;
    this.#ownerId = data.ownerId;
  }

  static async create(data: {
    name: string;
    permissions: string[];
    expiresAt?: Date;
    createdBy?: string;
    ownerId?: string;
  }): Promise<{ keyInfo: ApiKey; token: string }> {
    const rawKey = ApiKey.generateSecureKey();
    const hashedToken = await hashText(rawKey);
    const keyInfo = new ApiKey({
      id: randomUUID(),
      key: hashedToken,
      keyId: ApiKey.fetchKeyId(rawKey),
      name: data.name,
      permissions: data.permissions,
      expiresAt: data.expiresAt,
      ownerId: data.ownerId,
      createdBy: data.createdBy,
    });
    keyInfo.addDomainEvent(new ApiKeyCreatedEvent(keyInfo.toSnapshot<ApiKeyCreatedSnapshot>()));
    return { keyInfo, token: rawKey };
  }

  revoke(): void {
    if (this.isExpired()) return;
    this.#expiresAt = new Date(Date.now() - 1);
    this.touch();
    this.addDomainEvent(new ApiKeyRevokedEvent(this.toSnapshot<ApiKeyRevokedSnapshot>()));
  }

  used(): void {
    this.#lastUsedAt = new Date();
    this.touch();
    this.addDomainEvent(new ApiKeyUsedEvent(this.toSnapshot<ApiKeyUsedSnapshot>()));
  }

  updatePermissions(permissions: string[]): void {
    if (this.isExpired()) throw new ApiKeyExpiredError();
    this.#permissions = permissions;
    this.touch();
    this.addDomainEvent(new ApiKeyPermissionsUpdatedEvent(this.toSnapshot<ApiKeyPermissionsUpdatedSnapshot>()));
  }

  isExpired(): boolean {
    if (!this.#expiresAt) return false;
    return this.#expiresAt < new Date();
  }

  private static generateSecureKey(length = 32): string {
    const buffer = crypto.randomBytes(length);
    const keyId = crypto.randomBytes(length).toString('base64', 0, 12).replaceAll('_', '');
    return `sk_${keyId}_${buffer.toString('base64url')}`;
  }

  static fetchKeyId(apiKey: string): string {
    try {
      const parts = apiKey.split('_');
      if (parts.length < 3 || parts[0] !== 'sk') {
        return '';
      }
      return parts[1];
    } catch {
      return '';
    }
  }

  get name(): string { return this.#name; }
  get key(): string { return this.#key; }
  get keyId(): string { return this.#keyId; }
  get permissions(): string[] { return this.#permissions; }
  get expiresAt(): Date | undefined { return this.#expiresAt; }
  get lastUsedAt(): Date | undefined { return this.#lastUsedAt; }
  get createdBy(): string | undefined { return this.#createdBy; }
  get ownerId(): string | undefined { return this.#ownerId; }
}
