import { describe, expect, it } from 'vitest';
import { evaluateCondition } from './condition.js';

describe('evaluateCondition', () => {
  describe('equals operator', () => {
    it('returns true when currentValue matches', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'equals', value: 'yes' }, 'yes'),
      ).toBe(true);
    });

    it('returns false when currentValue does not match', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'equals', value: 'yes' }, 'no'),
      ).toBe(false);
    });

    it('returns false when currentValue is null', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'equals', value: 'yes' }, null),
      ).toBe(false);
    });
  });

  describe('not_equals operator', () => {
    it('returns true when currentValue does not match', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'not_equals', value: 'yes' }, 'no'),
      ).toBe(true);
    });

    it('returns false when currentValue matches', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'not_equals', value: 'yes' }, 'yes'),
      ).toBe(false);
    });
  });

  describe('in operator', () => {
    it('returns true when scalar currentValue is in the list', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'in', value: ['a', 'b', 'c'] }, 'b'),
      ).toBe(true);
    });

    it('returns true when array currentValue has overlap', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'in', value: ['a', 'b'] }, ['b', 'c']),
      ).toBe(true);
    });
  });

  describe('not_in operator', () => {
    it('returns true when scalar currentValue is not in the list', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'not_in', value: ['a', 'b'] }, 'c'),
      ).toBe(true);
    });

    it('returns false when array currentValue has overlap', () => {
      expect(
        evaluateCondition({ dependsOnKey: 'k', operator: 'not_in', value: ['a', 'b'] }, ['b', 'c']),
      ).toBe(false);
    });
  });
});
