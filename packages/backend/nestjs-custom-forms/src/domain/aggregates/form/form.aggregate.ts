import { randomUUID } from 'crypto';
import { AggregateRoot } from '@ssdev-toolkit/nestjs-core';
import { FormStatus } from '../../enums/form-status.enum';
import { FormFieldDefinition } from '../../entities/form-field-definition/form-field-definition.entity';
import { CustomFieldType } from '../../enums/custom-field-type.enum';
import { FieldOption } from '../../value-objects/field-option/field-option.vo';
import { FieldCondition } from '../../value-objects/field-condition/field-condition.vo';
import { DependentOptions } from '../../value-objects/dependent-options/dependent-options.vo';
import { FieldValidationRules } from '../../value-objects/field-validation-rules/field-validation-rules.vo';
import { FormKeyPolicy } from '../../policies/form-key.policy';
import {
  FormFieldKeyAlreadyExistsError,
  FormFieldMutationNotAllowedError,
  FormFieldNotFoundError,
  FormDisabledError,
} from '../../errors/form.errors';
import { FormCreatedEvent, type FormCreatedSnapshot } from '../../events/form-created.event';
import { FormUpdatedEvent, type FormUpdatedSnapshot } from '../../events/form-updated.event';
import { FormPublishedEvent, type FormPublishedSnapshot } from '../../events/form-published.event';
import { FormDisabledEvent, type FormDisabledSnapshot } from '../../events/form-disabled.event';
import { FormFieldAddedEvent, type FormFieldAddedSnapshot } from '../../events/form-field-added.event';
import { FormFieldUpdatedEvent, type FormFieldUpdatedSnapshot } from '../../events/form-field-updated.event';
import { FormFieldDisabledEvent, type FormFieldDisabledSnapshot } from '../../events/form-field-disabled.event';

export class Form extends AggregateRoot<string> {
  #entityType: string;
  #key: string;
  #label: string;
  #description: string | null;
  #status: FormStatus;
  #managePermissions: string[];
  #readPermissions: string[];
  #writePermissions: string[];
  #fields: FormFieldDefinition[];
  #createdBy?: string;
  #publishedBy?: string;
  #disabledBy?: string;

  constructor(
    id: string,
    entityType: string,
    key: string,
    label: string,
    description: string | null,
    status: FormStatus,
    managePermissions: string[],
    readPermissions: string[],
    writePermissions: string[],
    fields: FormFieldDefinition[],
    createdAt?: Date,
    updatedAt?: Date,
    createdBy?: string,
    publishedBy?: string,
    disabledBy?: string,
  ) {
    super(id, createdAt, updatedAt);
    this.#entityType = entityType;
    this.#key = key;
    this.#label = label;
    this.#description = description;
    this.#status = status;
    this.#managePermissions = managePermissions;
    this.#readPermissions = readPermissions;
    this.#writePermissions = writePermissions;
    this.#fields = fields;
    this.#createdBy = createdBy;
    this.#publishedBy = publishedBy;
    this.#disabledBy = disabledBy;
  }

  static create(params: {
    entityType: string;
    key: string;
    label: string;
    description?: string | null;
    managePermissions?: string[];
    readPermissions?: string[];
    writePermissions?: string[];
    createdBy?: string;
  }): Form {
    FormKeyPolicy.assertValidKey(params.key);

    const form = new Form(
      randomUUID(),
      params.entityType,
      params.key,
      params.label,
      params.description ?? null,
      FormStatus.Draft,
      params.managePermissions ?? [],
      params.readPermissions ?? [],
      params.writePermissions ?? [],
      [],
      undefined,
      undefined,
      params.createdBy,
    );
    form.addDomainEvent(new FormCreatedEvent(form.toSnapshot<FormCreatedSnapshot>()));
    return form;
  }

  updateMetadata(patch: {
    label?: string;
    description?: string | null;
    managePermissions?: string[];
    readPermissions?: string[];
    writePermissions?: string[];
  }): void {
    if (patch.label !== undefined) this.#label = patch.label;
    if ('description' in patch) this.#description = patch.description ?? null;
    if (patch.managePermissions !== undefined) this.#managePermissions = patch.managePermissions;
    if (patch.readPermissions !== undefined) this.#readPermissions = patch.readPermissions;
    if (patch.writePermissions !== undefined) this.#writePermissions = patch.writePermissions;
    this.touch();
    this.addDomainEvent(new FormUpdatedEvent(this.toSnapshot<FormUpdatedSnapshot>()));
  }

  publish(publishedBy?: string): void {
    if (this.#status !== FormStatus.Draft) return;
    this.#status = FormStatus.Published;
    this.#publishedBy = publishedBy;
    this.touch();
    this.addDomainEvent(new FormPublishedEvent(this.toSnapshot<FormPublishedSnapshot>()));
  }

  disable(disabledBy?: string): void {
    if (this.#status === FormStatus.Disabled) return;
    this.#status = FormStatus.Disabled;
    this.#disabledBy = disabledBy;
    this.touch();
    this.addDomainEvent(new FormDisabledEvent(this.toSnapshot<FormDisabledSnapshot>()));
  }

  addField(params: {
    key: string;
    label: string;
    fieldType: CustomFieldType;
    mandatory?: boolean;
    fieldOptions?: FieldOption[];
    isHidden?: boolean;
    isEncrypted?: boolean;
    sortOrder?: number;
    stepId?: string | null;
    stepName?: string | null;
    condition?: FieldCondition | null;
    dependentOptions?: DependentOptions | null;
    createdBy?: string;
    viewPermissions?: string[];
    validationRules?: FieldValidationRules | null;
  }): FormFieldDefinition {
    this.#assertFieldConfigMutationAllowed('add');
    FormKeyPolicy.assertValidKey(params.key);

    if (this.#fields.some((f) => f.key === params.key)) {
      throw new FormFieldKeyAlreadyExistsError(params.key, this.id);
    }

    const field = FormFieldDefinition.create({
      formId: this.id,
      ...params,
    });
    this.#fields.push(field);
    this.touch();
    this.addDomainEvent(new FormFieldAddedEvent({
      formId: this.id,
      field: field.toSnapshot(),
    }));
    return field;
  }

  updateField(
    fieldId: string,
    patch: {
      label?: string;
      fieldType?: CustomFieldType;
      mandatory?: boolean;
      fieldOptions?: FieldOption[];
      isHidden?: boolean;
      isEncrypted?: boolean;
      sortOrder?: number;
      stepId?: string | null;
      stepName?: string | null;
      condition?: FieldCondition | null;
      dependentOptions?: DependentOptions | null;
      viewPermissions?: string[];
      validationRules?: FieldValidationRules | null;
    },
  ): FormFieldDefinition {
    this.#assertFieldConfigMutationAllowed('update');
    const field = this.#findFieldOrThrow(fieldId);
    field.update(patch);
    this.touch();
    this.addDomainEvent(new FormFieldUpdatedEvent({
      formId: this.id,
      field: field.toSnapshot(),
    }));
    return field;
  }

  disableField(fieldId: string, disabledBy?: string): FormFieldDefinition {
    if (this.#status === FormStatus.Disabled) {
      throw new FormDisabledError(this.id);
    }
    const field = this.#findFieldOrThrow(fieldId);
    field.disable(disabledBy);
    this.touch();
    this.addDomainEvent(new FormFieldDisabledEvent({
      formId: this.id,
      field: field.toSnapshot<FormFieldDisabledSnapshot['field']>(),
    }));
    return field;
  }

  reorderFields(fieldIds: string[]): void {
    if (this.#status === FormStatus.Disabled) {
      throw new FormDisabledError(this.id);
    }

    const fieldMap = new Map(this.#fields.map((f) => [f.id, f]));
    if (fieldIds.length !== this.#fields.length) {
      throw new FormFieldNotFoundError('sort-order', this.id);
    }

    fieldIds.forEach((fieldId, index) => {
      const field = fieldMap.get(fieldId);
      if (!field) throw new FormFieldNotFoundError(fieldId, this.id);
      field.updateSortOrder(index);
    });

    this.#fields = fieldIds.map((id) => fieldMap.get(id)!);
    this.touch();
  }

  #assertFieldConfigMutationAllowed(operation: 'add' | 'update'): void {
    if (this.#status !== FormStatus.Draft) {
      throw new FormFieldMutationNotAllowedError(this.id, operation);
    }
  }

  #findFieldOrThrow(fieldId: string): FormFieldDefinition {
    const field = this.#fields.find((f) => f.id === fieldId);
    if (!field) throw new FormFieldNotFoundError(fieldId, this.id);
    return field;
  }

  get entityType(): string { return this.#entityType; }
  get key(): string { return this.#key; }
  get label(): string { return this.#label; }
  get description(): string | null { return this.#description; }
  get status(): FormStatus { return this.#status; }
  get managePermissions(): ReadonlyArray<string> { return this.#managePermissions; }
  get readPermissions(): ReadonlyArray<string> { return this.#readPermissions; }
  get writePermissions(): ReadonlyArray<string> { return this.#writePermissions; }
  get fields(): ReadonlyArray<FormFieldDefinition> { return this.#fields; }
  get createdBy(): string | undefined { return this.#createdBy; }
  get publishedBy(): string | undefined { return this.#publishedBy; }
  get disabledBy(): string | undefined { return this.#disabledBy; }
}
