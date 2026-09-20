import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';

export class RoleGroupFilter {
  key?: string;
  isActive?: boolean;
  /** When true, only shadow groups; when false, only non-shadow; omit for all. */
  isShadow?: boolean;
}

export class RoleGroup extends AggregateRoot<string> {
  readonly #key: string;
  #description?: string;
  #isShadow: boolean;
  #deletedAt?: Date;
  #roleKeys: string[];

  constructor(data: {
    id: string;
    key: string;
    description?: string;
    isShadow?: boolean;
    deletedAt?: Date;
    roleKeys?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this.#key = data.key;
    this.#description = data.description;
    this.#isShadow = data.isShadow ?? false;
    this.#deletedAt = data.deletedAt;
    this.#roleKeys = data.roleKeys ?? [];
  }

  static create(data: { key: string; description?: string; isShadow?: boolean }): RoleGroup {
    return new RoleGroup({
      id: randomUUID(),
      key: data.key,
      description: data.description,
      isShadow: data.isShadow ?? false,
    });
  }

  updateDescription(description?: string): void {
    this.#description = description;
    this.touch();
  }

  setShadow(isShadow: boolean): void {
    if (this.#isShadow === isShadow) return;
    this.#isShadow = isShadow;
    this.touch();
  }

  restore(): void {
    if (!this.#deletedAt) return;
    this.#deletedAt = undefined;
    this.touch();
  }

  softDelete(): void {
    if (this.#deletedAt) return;
    this.#deletedAt = new Date();
    this.touch();
  }

  withRoleKeys(keys: string[]): void {
    this.#roleKeys = keys;
  }

  isDeleted(): boolean {
    return !!this.#deletedAt;
  }

  get key(): string { return this.#key; }
  get description(): string | undefined { return this.#description; }
  get isShadow(): boolean { return this.#isShadow; }
  get deletedAt(): Date | undefined { return this.#deletedAt; }
  get roleKeys(): string[] { return this.#roleKeys; }
}
