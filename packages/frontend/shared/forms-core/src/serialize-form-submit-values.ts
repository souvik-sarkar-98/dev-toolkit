import type { FormDefinition, FormValues } from './models/types.js';
import { isPhoneValueEmpty } from './engine/phone.js';

/**
 * Shapes engine values for API POST bodies (field keys → JSON types).
 */
export function serializeFormSubmitValues(
  definition: FormDefinition,
  values: FormValues,
): Record<string, unknown> {
  const byKey = new Map(definition.fields.map((f) => [f.key, f]));
  const payload: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(values)) {
    const field = byKey.get(key);
    if (!field) continue;

    if (raw === null || raw === undefined) continue;
    if (raw === '' && field.fieldType !== 'boolean' && field.fieldType !== 'toggle') continue;
    if (field.fieldType === 'phone' && isPhoneValueEmpty(raw)) continue;

    switch (field.fieldType) {
      case 'number':
        payload[key] = typeof raw === 'number' ? raw : Number(raw);
        break;
      case 'boolean':
      case 'toggle':
        payload[key] = Boolean(raw);
        break;
      case 'multiselect':
        payload[key] = Array.isArray(raw) ? raw : [];
        break;
      case 'date_range':
        payload[key] = raw;
        break;
      default:
        payload[key] = raw;
    }
  }

  return payload;
}

/** @deprecated Use `serializeFormSubmitValues`. */
export const serializePublicFormSubmitValues = serializeFormSubmitValues;
