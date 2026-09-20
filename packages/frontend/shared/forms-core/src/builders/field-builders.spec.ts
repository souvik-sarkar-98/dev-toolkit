import { describe, expect, it } from 'vitest';
import { baseField, dateConstraintsTodayMax, toFieldOptions } from './field-builders.js';

describe('field-builders', () => {
  describe('toFieldOptions', () => {
    it('maps KeyValue displayValue to label', () => {
      expect(toFieldOptions([{ key: 'A', displayValue: 'Alpha' }])).toEqual([
        { key: 'A', label: 'Alpha' },
      ]);
    });

    it('falls back to label or key', () => {
      expect(toFieldOptions([{ key: 'B', label: 'Beta' }])).toEqual([
        { key: 'B', label: 'Beta' },
      ]);
      expect(toFieldOptions([{ key: 'C' }])).toEqual([{ key: 'C', label: 'C' }]);
    });

    it('returns empty array for undefined', () => {
      expect(toFieldOptions(undefined)).toEqual([]);
    });
  });

  describe('baseField', () => {
    it('applies defaults and merges partial', () => {
      const field = baseField({
        id: 'f1',
        key: 'name',
        label: 'Name',
        fieldType: 'text',
        sortOrder: 1,
        mandatory: true,
      });

      expect(field.mandatory).toBe(true);
      expect(field.placeholder).toBeNull();
      expect(field.condition).toBeNull();
      expect(field.fieldOptions).toEqual([]);
    });
  });

  describe('dateConstraintsTodayMax', () => {
    it('returns today max constraint', () => {
      expect(dateConstraintsTodayMax()).toEqual({ max: { kind: 'today' } });
    });
  });
});
