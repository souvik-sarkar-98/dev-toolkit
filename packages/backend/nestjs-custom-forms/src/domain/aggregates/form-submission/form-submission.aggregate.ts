import { randomUUID } from 'crypto';
import { AggregateRoot, RootEvent } from '@ssdev-toolkit/nestjs-core';
import { FormSubmissionStatus } from '../../enums/form-submission-status.enum';
import { FormFieldValue } from '../../entities/form-field-value/form-field-value.entity';
import { FormSubmissionAlreadySubmittedError } from '../../errors/form.errors';
import { FormFieldValuesUpdatedEvent, type FormFieldValuesUpdatedSnapshot } from '../../events/form-field-values-updated.event';
import { FormSubmittedEvent } from '../../events/form-submitted.event';
import type { CustomFieldValueParsed } from '../../value-objects/field-condition/field-condition.vo';
import { isParsedValueEmpty } from '../../utilities/form-field-parsed-value.util';

export class FormSubmission extends AggregateRoot<string> {
  #entityType: string;
  #entityId: string;
  #formId: string;
  #status: FormSubmissionStatus;
  #submittedAt?: Date;
  #submittedBy?: string;
  #fieldValues: FormFieldValue[];
  #integrationEvents: RootEvent[] = [];

  constructor(
    id: string,
    entityType: string,
    entityId: string,
    formId: string,
    status: FormSubmissionStatus,
    fieldValues: FormFieldValue[],
    createdAt?: Date,
    updatedAt?: Date,
    submittedAt?: Date,
    submittedBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this.#entityType = entityType;
    this.#entityId = entityId;
    this.#formId = formId;
    this.#status = status;
    this.#fieldValues = fieldValues;
    this.#submittedAt = submittedAt;
    this.#submittedBy = submittedBy;
  }

  static create(params: {
    entityType: string;
    entityId: string;
    formId: string;
  }): FormSubmission {
    return new FormSubmission(
      randomUUID(),
      params.entityType,
      params.entityId,
      params.formId,
      FormSubmissionStatus.Draft,
      [],
    );
  }

  /**
   * Persists draft field values. Rejected when the submission is already submitted.
   */
  saveDraft(
    values: Array<{ fieldDefId: string; value: CustomFieldValueParsed; changedBy: string }>,
  ): void {
    this.#assertNotSubmitted();

    for (const entry of values) {
      let fieldValue = this.#fieldValues.find((v) => v.fieldDefId === entry.fieldDefId);

      if (!fieldValue) {
        fieldValue = FormFieldValue.create({
          entityType: this.#entityType,
          entityId: this.#entityId,
          formId: this.#formId,
          fieldDefId: entry.fieldDefId,
          value: entry.value,
          changedBy: entry.changedBy,
        });
        this.#fieldValues.push(fieldValue);
        if (!isParsedValueEmpty(entry.value)) {
          this.addDomainEvent(new FormFieldValuesUpdatedEvent(
            fieldValue.toSnapshot<FormFieldValuesUpdatedSnapshot>(),
          ));
        }
        continue;
      }

      if (fieldValue.setValue(entry.value, entry.changedBy)) {
        this.addDomainEvent(new FormFieldValuesUpdatedEvent(
          fieldValue.toSnapshot<FormFieldValuesUpdatedSnapshot>(),
        ));
      }
    }

    this.touch();
  }

  submit(submittedBy: string): void {
    this.#assertNotSubmitted();
    this.#status = FormSubmissionStatus.Submitted;
    this.#submittedAt = new Date();
    this.#submittedBy = submittedBy;
    this.touch();
    this.#integrationEvents.push(new FormSubmittedEvent(
      this.#entityType,
      this.#entityId,
      this.#formId,
      submittedBy,
    ));
  }

  get integrationEvents(): ReadonlyArray<RootEvent> {
    return this.#integrationEvents;
  }

  clearIntegrationEvents(): void {
    this.#integrationEvents = [];
  }

  #assertNotSubmitted(): void {
    if (this.#status === FormSubmissionStatus.Submitted) {
      throw new FormSubmissionAlreadySubmittedError(
        this.#entityType,
        this.#entityId,
        this.#formId,
      );
    }
  }

  get entityType(): string { return this.#entityType; }
  get entityId(): string { return this.#entityId; }
  get formId(): string { return this.#formId; }
  get status(): FormSubmissionStatus { return this.#status; }
  get submittedAt(): Date | undefined { return this.#submittedAt; }
  get submittedBy(): string | undefined { return this.#submittedBy; }
  get fieldValues(): ReadonlyArray<FormFieldValue> { return this.#fieldValues; }
}
