import type { CustomFieldType, FormEngineOptions } from '../models/types.js';
import { isPhoneValueEmpty } from './phone.js';
import { isDateRangeEmpty } from './date-range.js';

export function getDefaultValueForFieldType(
  fieldType: CustomFieldType,
): string | number | boolean | string[] | Record<string, never> {
  switch (fieldType) {
    case 'boolean':
    case 'toggle':
      return false;
    case 'multiselect':
      return [];
    case 'date_range':
      return {};
    case 'number':
      return '';
    default:
      return '';
  }
}

export function isEmptyValue(
  fieldType: CustomFieldType,
  value: unknown,
  engineOptions?: FormEngineOptions,
): boolean {
  if (value === null || value === undefined) return true;
  if (fieldType === 'boolean' || fieldType === 'toggle') return false;
  if (fieldType === 'phone') return isPhoneValueEmpty(value, engineOptions);
  if (fieldType === 'multiselect') return !Array.isArray(value) || value.length === 0;
  if (fieldType === 'date_range') return isDateRangeEmpty(value);
  if (fieldType === 'number') {
    if (value === '') return true;
    return false;
  }
  return value === '';
}
