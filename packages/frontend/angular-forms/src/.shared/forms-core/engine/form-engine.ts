import type {
  FormDefinition,
  FormFieldDefinition,
  FormStep,
  FormValidationResult,
  FormValues,
  ResolvedField,
  FieldOption,
} from '../models/types.js';
import { getDependentOptions } from './dependent-options.js';
import { isEmptyValue } from './defaults.js';
import {
  buildDefByKey,
  getParentStringValue,
  isFieldVisible,
} from './visibility.js';
import {
  matchesValidationPattern,
  validationErrorMessageForValue,
} from './validation-pattern.js';
import {
  dateConstraintErrorMessage,
  isDateRangeWithinBounds,
  isIsoDateWithinBounds,
  resolveEffectiveDateBounds,
} from './date-constraints.js';
import type { FormEngineOptions } from '../models/types.js';

export function resolveFieldOptions(
  def: FormFieldDefinition,
  values: FormValues,
): FieldOption[] {
  const { fieldOptions } = def;
  return typeof fieldOptions === 'function' ? fieldOptions(values) : fieldOptions;
}

function resolveAvailableOptions(
  def: FormFieldDefinition,
  defByKey: Map<string, FormFieldDefinition>,
  values: FormValues,
): ResolvedField['availableOptions'] {
  if (def.fieldType === 'autocomplete') {
    return resolveFieldOptions(def, values);
  }

  if (def.fieldType !== 'select' && def.fieldType !== 'multiselect') {
    return [];
  }

  if (def.dependentOptions) {
    const parentKey = def.dependentOptions.dependsOnKey;
    const parentValue = getParentStringValue(values, parentKey);
    return getDependentOptions(def.dependentOptions, parentValue);
  }
  return resolveFieldOptions(def, values);
}

export function resolveFieldState(
  def: FormFieldDefinition,
  defByKey: Map<string, FormFieldDefinition>,
  values: FormValues,
  userPermissions: string[] = [],
  ignoreEncrypted = false,
): ResolvedField {
  if (ignoreEncrypted && def.isEncrypted) {
    return {
      definition: def,
      visible: false,
      effectiveMandatory: false,
      availableOptions: [],
    };
  }

  const visible = isFieldVisible(def, defByKey, values, userPermissions);
  const availableOptions = resolveAvailableOptions(def, defByKey, values);
  return {
    definition: def,
    visible,
    effectiveMandatory: visible && def.mandatory,
    availableOptions,
  };
}

export function resolveAllFields(
  definition: FormDefinition,
  values: FormValues,
  options: FormEngineOptions = {},
): ResolvedField[] {
  const defByKey = buildDefByKey(definition.fields);
  const permissions = options.userPermissions ?? [];
  const ignoreEncrypted = options.ignoreEncryptedValues ?? false;

  return [...definition.fields]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((def) => resolveFieldState(def, defByKey, values, permissions, ignoreEncrypted));
}

export function groupFieldsByStep(resolved: ResolvedField[]): FormStep[] {
  const visible = resolved.filter((r) => r.visible);
  const hasSteps = visible.some((r) => r.definition.stepId);
  if (!hasSteps) {
    return [{ stepId: '', stepName: null, fields: visible }];
  }

  const stepOrder: string[] = [];
  const byStep = new Map<string, ResolvedField[]>();

  for (const field of visible) {
    const stepId = field.definition.stepId ?? '';
    if (!byStep.has(stepId)) {
      byStep.set(stepId, []);
      stepOrder.push(stepId);
    }
    byStep.get(stepId)!.push(field);
  }

  return stepOrder.map((stepId) => {
    const fields = byStep.get(stepId)!;
    const stepName = fields[0]?.definition.stepName ?? null;
    return { stepId, stepName, fields };
  });
}

function valueAllowedForOptions(
  def: FormFieldDefinition,
  value: FormValues[string],
  availableKeys: Set<string>,
): boolean {
  if (value === null || value === undefined || availableKeys.size === 0) return true;
  if (def.fieldType === 'multiselect') {
    const keys = Array.isArray(value) ? value : [String(value)];
    return keys.every((k) => availableKeys.has(k));
  }
  if (def.fieldType === 'select') {
    return availableKeys.has(String(value));
  }
  return true;
}

export function validateForm(
  definition: FormDefinition,
  values: FormValues,
  options: FormEngineOptions = {},
): FormValidationResult {
  const resolved = resolveAllFields(definition, values, options);
  const missingMandatory: string[] = [];
  const conditionViolations: string[] = [];
  const validationViolations: string[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const field of resolved) {
    if (!field.visible) continue;
    const { key, label, fieldType, validationRules } = field.definition;
    const value = values[key] ?? null;

    if (field.effectiveMandatory && isEmptyValue(fieldType, value, options)) {
      missingMandatory.push(key);
      fieldErrors[key] = `${label} is required`;
      continue;
    }

    if (!isEmptyValue(fieldType, value, options) && (fieldType === 'select' || fieldType === 'multiselect')) {
      const availableKeys = new Set(field.availableOptions.map((o) => o.key));
      if (availableKeys.size > 0 && !valueAllowedForOptions(field.definition, value, availableKeys)) {
        conditionViolations.push(key);
        fieldErrors[key] = `Select a valid ${label.toLowerCase()}`;
      }
    }

    if (
      !isEmptyValue(fieldType, value, options) &&
      validationRules &&
      !matchesValidationPattern(fieldType, value, validationRules, options)
    ) {
      validationViolations.push(key);
      fieldErrors[key] = validationErrorMessageForValue(
        fieldType,
        label,
        value,
        validationRules,
        options,
      );
      continue;
    }

    const dateConstraints = field.definition.dateConstraints;
    if (
      !isEmptyValue(fieldType, value, options) &&
      dateConstraints &&
      (fieldType === 'date' || fieldType === 'date_range')
    ) {
      const bounds = resolveEffectiveDateBounds(dateConstraints, values);
      const withinBounds =
        fieldType === 'date'
          ? isIsoDateWithinBounds(typeof value === 'string' ? value : undefined, bounds)
          : isDateRangeWithinBounds(value, bounds);
      if (!withinBounds) {
        validationViolations.push(key);
        fieldErrors[key] = dateConstraintErrorMessage(label, bounds, dateConstraints);
      }
    }
  }

  return {
    missingMandatory,
    conditionViolations,
    validationViolations,
    fieldErrors,
    valid:
      missingMandatory.length === 0 &&
      conditionViolations.length === 0 &&
      validationViolations.length === 0,
  };
}

export function applyDependentValueEffects(
  definition: FormDefinition,
  values: FormValues,
  changedKey: string,
  engineOptions: FormEngineOptions = {},
): FormValues {
  const next = { ...values };
  const defByKey = buildDefByKey(definition.fields);
  const resolved = resolveAllFields(definition, next);

  for (const field of resolved) {
    const def = field.definition;
    const dependsOnChangedKey =
      def.dependentOptions?.dependsOnKey === changedKey ||
      def.condition?.dependsOnKey === changedKey;
    if (!dependsOnChangedKey) {
      continue;
    }

    if (!field.visible) {
      // Only clear values for dependent-option fields that became invalid.
      // Condition-only visibility hides fields (e.g. amount when status is PAID)
      // but their values must be preserved for submit.
      if (def.dependentOptions?.dependsOnKey === changedKey) {
        next[def.key] = getDefaultForClear(def.fieldType);
      }
      continue;
    }

    if (def.fieldType === 'select' || def.fieldType === 'multiselect') {
      const availableKeys = new Set(field.availableOptions.map((o) => o.key));
      const current = next[def.key];
      if (
        def.dependentOptions &&
        availableKeys.size === 0 &&
        !isEmptyValue(def.fieldType, current, engineOptions)
      ) {
        next[def.key] = getDefaultForClear(def.fieldType);
      } else if (!valueAllowedForOptions(def, current, availableKeys)) {
        next[def.key] = getDefaultForClear(def.fieldType);
      }
    }
  }

  return next;
}

function getDefaultForClear(fieldType: FormFieldDefinition['fieldType']): FormValues[string] {
  switch (fieldType) {
    case 'boolean':
    case 'toggle':
      return false;
    case 'multiselect':
      return [];
    case 'number':
      return '';
    default:
      return '';
  }
}

export { buildDefByKey };
