import type { FormValues } from '../models/types.js';
import { isDateRangeValue } from './date-range.js';

export function isSameFormValue(current: unknown, next: unknown): boolean {
  if (current === next) {
    return true;
  }
  if (isDateRangeValue(current) && isDateRangeValue(next)) {
    return current.startDate === next.startDate && current.endDate === next.endDate;
  }
  if (Array.isArray(current) && Array.isArray(next)) {
    return current.length === next.length && current.every((item, index) => item === next[index]);
  }
  return false;
}

export function hasSameFormValues(a: FormValues, b: FormValues): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!isSameFormValue(a[key], b[key])) {
      return false;
    }
  }
  return true;
}
