import type { CustomFieldValueParsed } from '../value-objects/field-condition/field-condition.vo';

export function isParsedValueEmpty(value: CustomFieldValueParsed): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function parsedValuesEqual(
  a: CustomFieldValueParsed,
  b: CustomFieldValueParsed,
): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((entry, index) => entry === b[index]);
  }
  return false;
}
