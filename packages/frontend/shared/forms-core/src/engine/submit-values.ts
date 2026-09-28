import type { FormValues, ResolvedField } from '../models/types.js';

/**
 * Visible-fields-only submit payload. Hidden fields (condition, permission,
 * or `isHidden`) are omitted so both React and Angular submit the same shape.
 */
export function getVisibleSubmitValues(
  values: FormValues,
  visibleFields: readonly ResolvedField[],
): FormValues {
  const visibleKeys = new Set(visibleFields.map((field) => field.definition.key));
  const out: FormValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (visibleKeys.has(key)) out[key] = value;
  }
  return out;
}
