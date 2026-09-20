import type { DateRangeValue } from '../models/types.js';

export function emptyDateRangeValue(): DateRangeValue {
  return {};
}

export function isDateRangeValue(value: unknown): value is DateRangeValue {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function isDateRangeEmpty(value: unknown): boolean {
  if (!isDateRangeValue(value)) return true;
  return !value.startDate?.trim() && !value.endDate?.trim();
}

/** Format `Date` to ISO date (`yyyy-MM-dd`) in local calendar. */
export function formatIsoDate(value: Date | null | undefined): string | undefined {
  if (!value || Number.isNaN(value.getTime())) return undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mergeDateRangePart(
  current: DateRangeValue | null | undefined,
  part: Partial<DateRangeValue>,
): DateRangeValue {
  const next: DateRangeValue = { ...(current ?? {}) };
  if ('startDate' in part) next.startDate = part.startDate || undefined;
  if ('endDate' in part) next.endDate = part.endDate || undefined;
  if (!next.startDate && !next.endDate) return {};
  return next;
}
