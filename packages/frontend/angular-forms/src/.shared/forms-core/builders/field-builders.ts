import type {
  DateFieldConstraints,
  FieldOption,
  FormFieldDefinition,
} from '../models/types.js';

/** Minimal KeyValue shape used by internal-app ref data. */
export interface KeyValueLike {
  key: string;
  label?: string;
  displayValue?: string;
}

export function toFieldOptions(
  items: KeyValueLike[] | FieldOption[] | undefined,
): FieldOption[] {
  return (items ?? []).map(item => ({
    key: item.key,
    label: 'displayValue' in item && item.displayValue != null
      ? item.displayValue
      : (item.label ?? item.key),
  }));
}

export function baseField(
  partial: Pick<FormFieldDefinition, 'id' | 'key' | 'label' | 'fieldType' | 'sortOrder'> &
    Partial<FormFieldDefinition>,
): FormFieldDefinition {
  return {
    placeholder: null,
    mandatory: false,
    fieldOptions: [],
    isHidden: false,
    isEncrypted: false,
    enabled: true,
    condition: null,
    dependentOptions: null,
    validationRules: null,
    ...partial,
  };
}

/** Common constraint: dates cannot be in the future. */
export function dateConstraintsTodayMax(): DateFieldConstraints {
  return { max: { kind: 'today' } };
}
