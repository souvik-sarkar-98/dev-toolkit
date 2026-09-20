import type { CustomFieldType } from '../models/types.js';
import { CUSTOM_FIELD_TYPES } from '../models/types.js';

const LEGACY_TYPE_MAP: Record<string, CustomFieldType> = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  EMAIL: 'email',
  PHONE: 'phone',
  NUMBER: 'number',
  CHECKBOX: 'boolean',
  BOOLEAN: 'boolean',
  TOGGLE: 'toggle',
  AUTOCOMPLETE: 'autocomplete',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
};

export function normalizeFieldType(raw: string): CustomFieldType {
  const trimmed = raw?.trim() ?? '';
  const lower = trimmed.toLowerCase();
  if ((CUSTOM_FIELD_TYPES as readonly string[]).includes(lower)) {
    return lower as CustomFieldType;
  }
  const legacy = LEGACY_TYPE_MAP[trimmed.toUpperCase()];
  if (legacy) return legacy;
  throw new Error(`Unknown field type: ${raw}`);
}
