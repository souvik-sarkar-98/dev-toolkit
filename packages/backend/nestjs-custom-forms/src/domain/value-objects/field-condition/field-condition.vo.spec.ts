import { FieldCondition } from './field-condition.vo';
import { InvalidFieldValueError } from '../../errors/form.errors';

describe('FieldCondition value object', () => {
  describe('of()', () => {
    it('creates a FieldCondition successfully', () => {
      const cond = FieldCondition.of('parent_key', 'equals', 'yes');

      expect(cond.dependsOnKey).toBe('parent_key');
      expect(cond.operator).toBe('equals');
      expect(cond.value).toBe('yes');
    });

    it('trims dependsOnKey', () => {
      const cond = FieldCondition.of('  parent_key  ', 'equals', 'yes');

      expect(cond.dependsOnKey).toBe('parent_key');
    });

    it('throws InvalidFieldValueError when dependsOnKey is empty', () => {
      expect(() => FieldCondition.of('', 'equals', 'val')).toThrow(InvalidFieldValueError);
      expect(() => FieldCondition.of('  ', 'equals', 'val')).toThrow(InvalidFieldValueError);
    });
  });

  describe('isSatisfiedBy()', () => {
    describe('equals operator', () => {
      it('returns true when currentValue matches', () => {
        const cond = FieldCondition.of('k', 'equals', 'yes');
        expect(cond.isSatisfiedBy('yes')).toBe(true);
      });

      it('returns false when currentValue does not match', () => {
        const cond = FieldCondition.of('k', 'equals', 'yes');
        expect(cond.isSatisfiedBy('no')).toBe(false);
      });

      it('returns false when currentValue is null', () => {
        const cond = FieldCondition.of('k', 'equals', 'yes');
        expect(cond.isSatisfiedBy(null)).toBe(false);
      });
    });

    describe('not_equals operator', () => {
      it('returns true when currentValue does not match', () => {
        const cond = FieldCondition.of('k', 'not_equals', 'yes');
        expect(cond.isSatisfiedBy('no')).toBe(true);
      });

      it('returns false when currentValue matches', () => {
        const cond = FieldCondition.of('k', 'not_equals', 'yes');
        expect(cond.isSatisfiedBy('yes')).toBe(false);
      });

      it('returns false when currentValue is null', () => {
        const cond = FieldCondition.of('k', 'not_equals', 'yes');
        expect(cond.isSatisfiedBy(null)).toBe(false);
      });
    });

    describe('in operator', () => {
      it('returns true when scalar currentValue is in the list', () => {
        const cond = FieldCondition.of('k', 'in', ['a', 'b', 'c']);
        expect(cond.isSatisfiedBy('b')).toBe(true);
      });

      it('returns false when scalar currentValue is not in the list', () => {
        const cond = FieldCondition.of('k', 'in', ['a', 'b']);
        expect(cond.isSatisfiedBy('x')).toBe(false);
      });

      it('returns true when array currentValue has overlap with the list', () => {
        const cond = FieldCondition.of('k', 'in', ['a', 'b']);
        expect(cond.isSatisfiedBy(['b', 'c'])).toBe(true);
      });

      it('returns false when array currentValue has no overlap', () => {
        const cond = FieldCondition.of('k', 'in', ['a', 'b']);
        expect(cond.isSatisfiedBy(['x', 'y'])).toBe(false);
      });

      it('returns false when currentValue is null', () => {
        const cond = FieldCondition.of('k', 'in', ['a']);
        expect(cond.isSatisfiedBy(null)).toBe(false);
      });
    });

    describe('not_in operator', () => {
      it('returns true when scalar currentValue is not in the list', () => {
        const cond = FieldCondition.of('k', 'not_in', ['a', 'b']);
        expect(cond.isSatisfiedBy('c')).toBe(true);
      });

      it('returns false when scalar currentValue is in the list', () => {
        const cond = FieldCondition.of('k', 'not_in', ['a', 'b']);
        expect(cond.isSatisfiedBy('a')).toBe(false);
      });

      it('returns false when array currentValue has any overlap', () => {
        const cond = FieldCondition.of('k', 'not_in', ['a', 'b']);
        expect(cond.isSatisfiedBy(['b', 'c'])).toBe(false);
      });

      it('returns true when array currentValue has no overlap', () => {
        const cond = FieldCondition.of('k', 'not_in', ['a', 'b']);
        expect(cond.isSatisfiedBy(['x', 'y'])).toBe(true);
      });

      it('returns false when currentValue is null', () => {
        const cond = FieldCondition.of('k', 'not_in', ['a']);
        expect(cond.isSatisfiedBy(null)).toBe(false);
      });
    });
  });
});
