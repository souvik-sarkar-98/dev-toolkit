import { randomUUID } from 'crypto';
import { BaseDomain } from '@ssdev-toolkit/nestjs-core';
import { CustomFieldType } from '../../enums/custom-field-type.enum';
import { FieldOption } from '../../value-objects/field-option/field-option.vo';
import { FieldCondition } from '../../value-objects/field-condition/field-condition.vo';
import { DependentOptions } from '../../value-objects/dependent-options/dependent-options.vo';
import { FieldValidationRules } from '../../value-objects/field-validation-rules/field-validation-rules.vo';

/**
 * Child entity — no repository. Accessed only through the Form aggregate.
 */
export class FormFieldDefinition extends BaseDomain<string> {
  readonly #formId: string;
  readonly #key: string;
  #label: string;
  #fieldType: CustomFieldType;
  #mandatory: boolean;
  #fieldOptions: FieldOption[];
  #isHidden: boolean;
  #isEncrypted: boolean;
  #enabled: boolean;
  #sortOrder: number;
  #stepId: string | null;
  #stepName: string | null;
  #condition: FieldCondition | null;
  #dependentOptions: DependentOptions | null;
  #validationRules: FieldValidationRules | null;
  #viewPermissions: string[];
  #createdBy?: string;
  #disabledBy?: string;

  constructor(
    id: string,
    formId: string,
    key: string,
    label: string,
    fieldType: CustomFieldType,
    mandatory: boolean,
    fieldOptions: FieldOption[],
    isHidden: boolean,
    isEncrypted: boolean,
    enabled: boolean,
    sortOrder: number,
    condition: FieldCondition | null,
    dependentOptions: DependentOptions | null,
    createdAt?: Date,
    updatedAt?: Date,
    createdBy?: string,
    disabledBy?: string,
    viewPermissions: string[] = [],
    validationRules: FieldValidationRules | null = null,
    stepId: string | null = null,
    stepName: string | null = null,
  ) {
    super(id, createdAt, updatedAt);
    this.#formId = formId;
    this.#key = key;
    this.#label = label;
    this.#fieldType = fieldType;
    this.#mandatory = mandatory;
    this.#fieldOptions = fieldOptions;
    this.#isHidden = isHidden;
    this.#isEncrypted = isEncrypted;
    this.#enabled = enabled;
    this.#sortOrder = sortOrder;
    this.#stepId = stepId;
    this.#stepName = stepName;
    this.#condition = condition;
    this.#dependentOptions = dependentOptions;
    this.#validationRules = validationRules;
    this.#viewPermissions = viewPermissions;
    this.#createdBy = createdBy;
    this.#disabledBy = disabledBy;
  }

  static create(params: {
    formId: string;
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
    return new FormFieldDefinition(
      randomUUID(),
      params.formId,
      params.key,
      params.label,
      params.fieldType,
      params.mandatory ?? false,
      params.fieldOptions ?? [],
      params.isHidden ?? false,
      params.isEncrypted ?? false,
      true,
      params.sortOrder ?? 0,
      params.condition ?? null,
      params.dependentOptions ?? null,
      undefined,
      undefined,
      params.createdBy,
      undefined,
      params.viewPermissions ?? [],
      params.validationRules ?? null,
      params.stepId ?? null,
      params.stepName ?? null,
    );
  }

  update(patch: {
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
  }): void {
    if (patch.label !== undefined) this.#label = patch.label;
    if (patch.fieldType !== undefined) this.#fieldType = patch.fieldType;
    if (patch.mandatory !== undefined) this.#mandatory = patch.mandatory;
    if (patch.fieldOptions !== undefined) this.#fieldOptions = patch.fieldOptions;
    if (patch.isHidden !== undefined) this.#isHidden = patch.isHidden;
    if (patch.isEncrypted !== undefined) this.#isEncrypted = patch.isEncrypted;
    if (patch.sortOrder !== undefined) this.#sortOrder = patch.sortOrder;
    if ('stepId' in patch) this.#stepId = patch.stepId ?? null;
    if ('stepName' in patch) this.#stepName = patch.stepName ?? null;
    if ('condition' in patch) this.#condition = patch.condition ?? null;
    if ('dependentOptions' in patch) this.#dependentOptions = patch.dependentOptions ?? null;
    if ('validationRules' in patch) this.#validationRules = patch.validationRules ?? null;
    if (patch.viewPermissions !== undefined) this.#viewPermissions = patch.viewPermissions;
    this.touch();
  }

  /** Soft-disables the field. Idempotent if already disabled. */
  disable(disabledBy?: string): void {
    if (!this.#enabled) return;
    this.#enabled = false;
    this.#disabledBy = disabledBy;
    this.touch();
  }

  /** Updates sort order only — used by BulkUpdateSortOrderHandler. */
  updateSortOrder(sortOrder: number): void {
    if (this.#sortOrder === sortOrder) return;
    this.#sortOrder = sortOrder;
    this.touch();
  }

  get formId(): string { return this.#formId; }
  get key(): string { return this.#key; }
  get label(): string { return this.#label; }
  get fieldType(): CustomFieldType { return this.#fieldType; }
  get mandatory(): boolean { return this.#mandatory; }
  get fieldOptions(): ReadonlyArray<FieldOption> { return this.#fieldOptions; }
  get isHidden(): boolean { return this.#isHidden; }
  get isEncrypted(): boolean { return this.#isEncrypted; }
  get enabled(): boolean { return this.#enabled; }
  get sortOrder(): number { return this.#sortOrder; }
  get stepId(): string | null { return this.#stepId; }
  get stepName(): string | null { return this.#stepName; }
  get condition(): FieldCondition | null { return this.#condition; }
  get dependentOptions(): DependentOptions | null { return this.#dependentOptions; }
  get validationRules(): FieldValidationRules | null { return this.#validationRules; }
  get viewPermissions(): ReadonlyArray<string> { return this.#viewPermissions; }
  get createdBy(): string | undefined { return this.#createdBy; }
  get disabledBy(): string | undefined { return this.#disabledBy; }
}
