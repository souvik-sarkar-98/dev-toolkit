import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { JsonDocumentInvalidError } from '../errors/json-store.errors';
import { JsonDocumentCreatedEvent, type JsonDocumentCreatedSnapshot } from '../events/json-document-created.event';
import { JsonDocumentUpdatedEvent, type JsonDocumentUpdatedSnapshot } from '../events/json-document-updated.event';
import { JsonDocumentDeletedEvent, type JsonDocumentDeletedSnapshot } from '../events/json-document-deleted.event';

export class JsonDocument extends AggregateRoot<string> {
  #key: string;
  #namespace: string;
  #payload: Record<string, unknown>;

  constructor(
    id: string,
    key: string,
    namespace: string,
    payload: Record<string, unknown>,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#key = key;
    this.#namespace = namespace;
    this.#payload = payload;
  }

  /**
   * Factory — the only public way to create a new JSON document.
   * Raises JsonDocumentCreatedEvent.
   */
  static create(op: {
    key: string;
    namespace: string;
    payload: Record<string, unknown>;
  }): JsonDocument {
    if (!op.key?.trim()) throw new JsonDocumentInvalidError('key must not be empty');
    if (!op.namespace?.trim()) throw new JsonDocumentInvalidError('namespace must not be empty');

    const doc = new JsonDocument(randomUUID(), op.key.trim(), op.namespace.trim(), op.payload);
    doc.addDomainEvent(new JsonDocumentCreatedEvent(doc.toSnapshot<JsonDocumentCreatedSnapshot>()));
    return doc;
  }

  /**
   * Replaces the payload with a new value.
   * Raises JsonDocumentUpdatedEvent.
   */
  update(payload: Record<string, unknown>): void {
    this.#payload = payload;
    this.touch();
    this.addDomainEvent(new JsonDocumentUpdatedEvent(this.toSnapshot<JsonDocumentUpdatedSnapshot>()));
  }

  /**
   * Signals that this document has been removed.
   * Raises JsonDocumentDeletedEvent so subscribers can react (e.g. cache eviction).
   */
  markDeleted(): void {
    this.addDomainEvent(new JsonDocumentDeletedEvent(this.toSnapshot<JsonDocumentDeletedSnapshot>()));
  }

  get key(): string {
    return this.#key;
  }

  get namespace(): string {
    return this.#namespace;
  }

  get payload(): Record<string, unknown> {
    return { ...this.#payload };
  }
}
