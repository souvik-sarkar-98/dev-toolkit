import { FieldOption } from './field-option.vo';
import { InvalidFieldValueError } from '../../errors/form.errors';

describe('FieldOption value object', () => {
  describe('of()', () => {
    it('creates a FieldOption with trimmed key and label', () => {
      const opt = FieldOption.of('  opt1  ', '  Option 1  ');

      expect(opt.key).toBe('opt1');
      expect(opt.label).toBe('Option 1');
    });

    it('throws InvalidFieldValueError when key is empty', () => {
      expect(() => FieldOption.of('', 'Some Label')).toThrow(InvalidFieldValueError);
      expect(() => FieldOption.of('  ', 'Some Label')).toThrow(InvalidFieldValueError);
    });

    it('throws InvalidFieldValueError when label is empty', () => {
      expect(() => FieldOption.of('key1', '')).toThrow(InvalidFieldValueError);
      expect(() => FieldOption.of('key1', '   ')).toThrow(InvalidFieldValueError);
    });
  });

  describe('equals()', () => {
    it('returns true for options with same key and label', () => {
      const a = FieldOption.of('k1', 'Label A');
      const b = FieldOption.of('k1', 'Label A');

      expect(a.equals(b)).toBe(true);
    });

    it('returns false when keys differ', () => {
      const a = FieldOption.of('k1', 'Label');
      const b = FieldOption.of('k2', 'Label');

      expect(a.equals(b)).toBe(false);
    });

    it('returns false when labels differ', () => {
      const a = FieldOption.of('k1', 'Label A');
      const b = FieldOption.of('k1', 'Label B');

      expect(a.equals(b)).toBe(false);
    });

    it('is not referential equality — two instances with same values are equal', () => {
      const a = FieldOption.of('k1', 'L');
      const b = FieldOption.of('k1', 'L');

      expect(a).not.toBe(b);
      expect(a.equals(b)).toBe(true);
    });
  });
});
