import type {
  CustomFieldType,
  CustomFieldValueParsed,
  FieldValidationRule,
  FieldValidationRules,
  FormEngineOptions,
} from '../models/types.js';
import { phoneValueForValidation } from './phone.js';

function toMatchString(fieldType: CustomFieldType, value: unknown): string | null {
  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'date':
      return typeof value === 'string' ? value : null;
    case 'number':
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (typeof value === 'string' && value.trim() !== '') return value.trim();
      return null;
    default:
      return null;
  }
}

export function normalizeFieldValidationRules(
  rules: FieldValidationRules | null | undefined,
): FieldValidationRule[] {
  if (rules == null) return [];
  return Array.isArray(rules) ? rules : [rules];
}

function candidateForRule(
  fieldType: CustomFieldType,
  value: CustomFieldValueParsed,
  engineOptions?: FormEngineOptions,
): string | null {
  let candidate = toMatchString(fieldType, value);
  if (fieldType === 'phone') {
    candidate = phoneValueForValidation(value, engineOptions);
  }
  return candidate;
}

export function matchesValidationRule(
  fieldType: CustomFieldType,
  value: CustomFieldValueParsed,
  rule: FieldValidationRule,
  engineOptions?: FormEngineOptions,
): boolean {
  if (!rule.pattern) return true;
  const candidate = candidateForRule(fieldType, value, engineOptions);
  if (candidate === null || candidate === '') return true;
  try {
    return new RegExp(rule.pattern).test(candidate);
  } catch {
    return true;
  }
}

/** All rules must pass (AND). Empty rule list passes. */
export function matchesValidationPattern(
  fieldType: CustomFieldType,
  value: CustomFieldValueParsed,
  rules: FieldValidationRules | null,
  engineOptions?: FormEngineOptions,
): boolean {
  return findFirstFailedValidationRule(fieldType, value, rules, engineOptions) == null;
}

export function findFirstFailedValidationRule(
  fieldType: CustomFieldType,
  value: CustomFieldValueParsed,
  rules: FieldValidationRules | null,
  engineOptions?: FormEngineOptions,
): FieldValidationRule | null {
  for (const rule of normalizeFieldValidationRules(rules)) {
    if (!matchesValidationRule(fieldType, value, rule, engineOptions)) {
      return rule;
    }
  }
  return null;
}

export function validationErrorMessage(
  fieldLabel: string,
  rules: FieldValidationRules | null,
  failedRule?: FieldValidationRule | null,
): string {
  const rule =
    failedRule ??
    normalizeFieldValidationRules(rules).find((r) => Boolean(r.regexErrMsg)) ??
    normalizeFieldValidationRules(rules)[0];
  return rule?.regexErrMsg ?? `Enter a valid ${fieldLabel.toLowerCase()}`;
}

export function validationErrorMessageForValue(
  fieldType: CustomFieldType,
  fieldLabel: string,
  value: CustomFieldValueParsed,
  rules: FieldValidationRules | null,
  engineOptions?: FormEngineOptions,
): string {
  const failed = findFirstFailedValidationRule(fieldType, value, rules, engineOptions);
  return validationErrorMessage(fieldLabel, rules, failed);
}
