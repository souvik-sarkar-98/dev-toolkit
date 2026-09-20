import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';

export class PermissionFilter {
  key?: string;
  isActive?: boolean;
}

export class Permission extends AggregateRoot<string> {
  readonly #key: string;
  #description?: string;
  #deletedAt?: Date;

  constructor(data: {
    id: string;
    key: string;
    description?: string;
    deletedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(data.id, data.createdAt, data.updatedAt);
    this.#key = data.key;
    this.#description = data.description;
    this.#deletedAt = data.deletedAt;
  }

  static create(data: { key: string; description?: string }): Permission {
    return new Permission({ id: randomUUID(), key: data.key, description: data.description });
  }

  updateDescription(description?: string): void {
    this.#description = description;
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

  isDeleted(): boolean {
    return !!this.#deletedAt;
  }

  get key(): string { return this.#key; }
  get description(): string | undefined { return this.#description; }
  get deletedAt(): Date | undefined { return this.#deletedAt; }
}
