import type { CustomFieldValueParsed, FieldCondition } from '../models/types.js';

export function evaluateCondition(
  condition: FieldCondition,
  currentValue: CustomFieldValueParsed,
): boolean {
  if (currentValue === null || currentValue === undefined) return false;

  switch (condition.operator) {
    case 'equals':
      return currentValue === condition.value;
    case 'not_equals':
      return currentValue !== condition.value;
    case 'in': {
      const opts = condition.value as string[];
      if (Array.isArray(currentValue)) {
        return (currentValue as string[]).some((v) => opts.includes(v));
      }
      return opts.includes(currentValue as string);
    }
    case 'not_in': {
      const opts = condition.value as string[];
      if (Array.isArray(currentValue)) {
        return !(currentValue as string[]).some((v) => opts.includes(v));
      }
      return !opts.includes(currentValue as string);
    }
    default:
      return false;
  }
}
