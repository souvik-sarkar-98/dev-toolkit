import { randomUUID } from 'crypto';
import { BaseDomain } from '@ssdev-toolkit/nestjs-core';
import type { CustomFieldValueParsed } from '../../value-objects/field-condition/field-condition.vo';

/**
 * Child entity — no repository. Accessed only through the FormFieldValue entity.
 *
 * Records a single change to a form field value: who changed it, when,
 * and what it changed from/to. The `createdAt` inherited from BaseDomain
 * serves as the change timestamp.
 */
export class FormFieldValueHistoryEntry extends BaseDomain<string> {
  readonly #formId: string;
  readonly #fieldDefId: string;
  readonly #entityType: string;
  readonly #entityId: string;
  readonly #oldValue: CustomFieldValueParsed;
  readonly #newValue: CustomFieldValueParsed;
  readonly #changedBy: string;

  constructor(
    id: string,
    formId: string,
    fieldDefId: string,
    entityType: string,
    entityId: string,
    oldValue: CustomFieldValueParsed,
    newValue: CustomFieldValueParsed,
    changedBy: string,
    createdAt?: Date,
  ) {
    super(id, createdAt);
    this.#formId = formId;
    this.#fieldDefId = fieldDefId;
    this.#entityType = entityType;
    this.#entityId = entityId;
    this.#oldValue = oldValue;
    this.#newValue = newValue;
    this.#changedBy = changedBy;
  }

  static create(params: {
    formId: string;
    fieldDefId: string;
    entityType: string;
    entityId: string;
    oldValue: CustomFieldValueParsed;
    newValue: CustomFieldValueParsed;
    changedBy: string;
  }): FormFieldValueHistoryEntry {
    return new FormFieldValueHistoryEntry(
      randomUUID(),
      params.formId,
      params.fieldDefId,
      params.entityType,
      params.entityId,
      params.oldValue,
      params.newValue,
      params.changedBy,
    );
  }

  get formId(): string { return this.#formId; }
  get fieldDefId(): string { return this.#fieldDefId; }
  get entityType(): string { return this.#entityType; }
  get entityId(): string { return this.#entityId; }
  get oldValue(): CustomFieldValueParsed { return this.#oldValue; }
  get newValue(): CustomFieldValueParsed { return this.#newValue; }
  get changedBy(): string { return this.#changedBy; }
}
