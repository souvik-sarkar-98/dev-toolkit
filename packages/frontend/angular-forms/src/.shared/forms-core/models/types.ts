export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'boolean',
  'toggle',
  'date',
  'date_range',
  'select',
  'multiselect',
  'autocomplete',
  'password',
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type FieldConditionOperator = 'equals' | 'not_equals' | 'in' | 'not_in';

/** ISO `yyyy-MM-dd` date strings for Material date-range fields. */
export interface DateRangeValue {
  startDate?: string;
  endDate?: string;
}

export type CustomFieldValueParsed =
  | string
  | number
  | boolean
  | string[]
  | DateRangeValue
  | null;

export interface FieldOption {
  key: string;
  label: string;
}

/** Dynamic select/autocomplete options from current form values. */
export type FieldOptionsResolver = (values: FormValues) => FieldOption[];

/** Static or dynamic helper text shown under a field (Material `mat-hint`). */
export type FieldHintResolver = (values: FormValues) => string | null | undefined;

export interface FieldCondition {
  dependsOnKey: string;
  operator: FieldConditionOperator;
  value: string | number | boolean | string[];
}

export interface DependentOptions {
  dependsOnKey: string;
  optionMap: Record<string, FieldOption[]>;
}

export interface FieldValidationRule {
  /** Optional stable key from backend (e.g. `no-digits`). */
  key?: string;
  pattern: string;
  regexErrMsg?: string;
}

/** How to resolve a calendar bound (min/max). */
export type DateBoundRef =
  | { kind: 'literal'; value: string }
  | { kind: 'today' }
  | { kind: 'field'; key: string }
  | { kind: 'rangePart'; part: 'startDate' | 'endDate' };

/** Configurable bounds for `date` and `date_range` fields. */
export interface DateFieldConstraints {
  /** Earliest selectable day for single-date fields and range start input. */
  min?: DateBoundRef;
  /** Latest selectable day for single-date fields and range start input. */
  max?: DateBoundRef;
  /** Override min for the range end input (defaults to `min`). */
  endMin?: DateBoundRef;
  /** Override max for the range end input (defaults to `max`). */
  endMax?: DateBoundRef;
  /** Disable specific weekdays (`0` = Sunday … `6` = Saturday). */
  disabledWeekdays?: number[];
  /** Shorthand for `disabledWeekdays: [0, 6]`. */
  disableWeekends?: boolean;
}

/** Single rule or ordered list (all must pass). */
export type FieldValidationRules = FieldValidationRule | FieldValidationRule[];

export interface FormFieldDefinition {
  id: string;
  key: string;
  label: string;
  /** Shown inside the control when empty (inputs / selects). */
  placeholder?: string | null;
  /**
   * Helper text under the control (`mat-hint`).
   * Use a function to compute text from current form values (e.g. after selecting a donor).
   */
  hint?: string | FieldHintResolver | null;
  fieldType: CustomFieldType;
  mandatory: boolean;
  fieldOptions: FieldOption[] | FieldOptionsResolver;
  isHidden: boolean;
  isEncrypted: boolean;
  enabled: boolean;
  /** When true, field is visible but not editable (values still submit). */
  readOnly?: boolean;
  sortOrder: number;
  condition: FieldCondition | null;
  dependentOptions: DependentOptions | null;
  validationRules: FieldValidationRules | null;
  dateConstraints?: DateFieldConstraints | null;
  viewPermissions?: string[];
  stepId?: string | null;
  stepName?: string | null;
}

export interface FormDefinition {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fields: FormFieldDefinition[];
}

export type FormValues = Record<string, CustomFieldValueParsed>;

export interface ResolvedField {
  definition: FormFieldDefinition;
  visible: boolean;
  effectiveMandatory: boolean;
  availableOptions: FieldOption[];
}

export interface FormStep {
  stepId: string;
  stepName: string | null;
  fields: ResolvedField[];
}

export interface FormValidationResult {
  missingMandatory: string[];
  conditionViolations: string[];
  validationViolations: string[];
  fieldErrors: Record<string, string>;
  valid: boolean;
}

export interface PhoneCountryCodeOption {
  /** Dial code including "+" (e.g. "+1", "+91"). */
  code: string;
  label?: string;
}

export interface FormEngineOptions {
  userPermissions?: string[];
  /** When true, encrypted fields are omitted from resolved visible fields (public site). */
  ignoreEncryptedValues?: boolean;
  /** Default dial code for `phone` fields (default "+1"). */
  defaultPhoneCountryCode?: string;
  /** Country codes shown in phone inputs; defaults to the default dial code only. */
  phoneCountryCodes?: PhoneCountryCodeOption[];
}
