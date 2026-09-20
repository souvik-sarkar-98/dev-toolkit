import { describe, expect, it } from 'vitest';
import {
  createDatePickerFilter,
  dateConstraintErrorMessage,
  isIsoDateWithinBounds,
  resolveEffectiveDateBounds,
} from './date-constraints.js';

describe('date constraints', () => {
  const today = new Date(2026, 7, 5);

  it('resolves today as max bound', () => {
    const bounds = resolveEffectiveDateBounds({ max: { kind: 'today' } }, {}, today);
    expect(bounds.max?.toDateString()).toBe(today.toDateString());
    expect(bounds.min).toBeNull();
  });

  it('resolves today as min bound', () => {
    const bounds = resolveEffectiveDateBounds({ min: { kind: 'today' } }, {}, today);
    expect(bounds.min?.toDateString()).toBe(today.toDateString());
    expect(bounds.max).toBeNull();
  });

  it('resolves literal ISO bounds', () => {
    const bounds = resolveEffectiveDateBounds(
      {
        min: { kind: 'literal', value: '2026-01-01' },
        max: { kind: 'literal', value: '2026-08-01' },
      },
      {},
      today,
    );
    expect(bounds.min?.toDateString()).toBe(new Date(2026, 0, 1).toDateString());
    expect(bounds.max?.toDateString()).toBe(new Date(2026, 7, 1).toDateString());
  });

  it('resolves field reference from form values', () => {
    const bounds = resolveEffectiveDateBounds(
      { min: { kind: 'field', key: 'startDate' } },
      { startDate: '2026-08-01' },
      today,
    );
    expect(bounds.min?.toDateString()).toBe(new Date(2026, 7, 1).toDateString());
  });

  it('resolves rangePart endMin from current range value', () => {
    const bounds = resolveEffectiveDateBounds(
      {
        max: { kind: 'today' },
        endMin: { kind: 'rangePart', part: 'startDate' },
      },
      {},
      today,
      { startDate: '2026-08-01' },
    );
    expect(bounds.endMin?.toDateString()).toBe(new Date(2026, 7, 1).toDateString());
    expect(bounds.max?.toDateString()).toBe(today.toDateString());
  });

  it('filters future dates when max is today', () => {
    const filter = createDatePickerFilter(
      resolveEffectiveDateBounds({ max: { kind: 'today' } }, {}, today),
    );
    expect(filter(new Date(2026, 7, 4))).toBe(true);
    expect(filter(new Date(2026, 7, 5))).toBe(true);
    expect(filter(new Date(2026, 7, 6))).toBe(false);
  });

  it('validates ISO dates against bounds', () => {
    const bounds = resolveEffectiveDateBounds({ max: { kind: 'today' } }, {}, today);
    expect(isIsoDateWithinBounds('2026-08-05', bounds)).toBe(true);
    expect(isIsoDateWithinBounds('2026-08-06', bounds)).toBe(false);
  });

  it('returns a friendly error for max bound', () => {
    const bounds = resolveEffectiveDateBounds({ max: { kind: 'today' } }, {}, today);
    expect(dateConstraintErrorMessage('Paid on', bounds))
      .toBe('Paid on must be on or before 05/08/2026');
  });

  it('disables weekends via disableWeekends shorthand', () => {
    const bounds = resolveEffectiveDateBounds({ disableWeekends: true }, {}, today);
    const filter = createDatePickerFilter(bounds);
    expect(filter(new Date(2026, 7, 7))).toBe(true); // Friday
    expect(filter(new Date(2026, 7, 8))).toBe(false); // Saturday
    expect(filter(new Date(2026, 7, 9))).toBe(false); // Sunday
    expect(filter(new Date(2026, 7, 10))).toBe(true); // Monday
  });

  it('disables specific weekdays via disabledWeekdays', () => {
    const bounds = resolveEffectiveDateBounds({ disabledWeekdays: [0, 6] }, {}, today);
    expect(isIsoDateWithinBounds('2026-08-08', bounds)).toBe(false); // Saturday
    expect(isIsoDateWithinBounds('2026-08-07', bounds)).toBe(true); // Friday
  });

  it('returns a friendly error for weekend-only constraints', () => {
    const bounds = resolveEffectiveDateBounds({ disableWeekends: true }, {}, today);
    expect(dateConstraintErrorMessage('Paid on', bounds, { disableWeekends: true }))
      .toBe('Paid on cannot fall on a weekend');
  });
});
