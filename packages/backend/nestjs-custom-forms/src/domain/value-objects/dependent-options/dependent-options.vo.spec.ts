import { DependentOptions } from './dependent-options.vo';
import { FieldOption } from '../field-option/field-option.vo';
import { InvalidFieldValueError } from '../../errors/form.errors';

function makeOptionMap() {
  return {
    cat1: [FieldOption.of('a', 'Option A'), FieldOption.of('b', 'Option B')],
    cat2: [FieldOption.of('c', 'Option C')],
  };
}

describe('DependentOptions value object', () => {
  describe('of()', () => {
    it('creates a DependentOptions successfully', () => {
      const dep = DependentOptions.of('parent_key', makeOptionMap());

      expect(dep.dependsOnKey).toBe('parent_key');
    });

    it('trims dependsOnKey whitespace', () => {
      const dep = DependentOptions.of('  parent_key  ', makeOptionMap());

      expect(dep.dependsOnKey).toBe('parent_key');
    });

    it('throws InvalidFieldValueError when dependsOnKey is empty', () => {
      expect(() => DependentOptions.of('', makeOptionMap())).toThrow(InvalidFieldValueError);
      expect(() => DependentOptions.of('  ', makeOptionMap())).toThrow(InvalidFieldValueError);
    });

    it('throws InvalidFieldValueError when optionMap is empty', () => {
      expect(() => DependentOptions.of('parent', {})).toThrow(InvalidFieldValueError);
    });
  });

  describe('getOptionsFor()', () => {
    it('returns the correct child options for a known parent value', () => {
      const dep = DependentOptions.of('parent', makeOptionMap());

      const opts = dep.getOptionsFor('cat1');

      expect(opts).toHaveLength(2);
      expect(opts[0].key).toBe('a');
      expect(opts[1].key).toBe('b');
    });

    it('returns empty array for an unknown parent value', () => {
      const dep = DependentOptions.of('parent', makeOptionMap());

      expect(dep.getOptionsFor('unknown')).toHaveLength(0);
    });

    it('returns empty array when parentValue is null', () => {
      const dep = DependentOptions.of('parent', makeOptionMap());

      expect(dep.getOptionsFor(null)).toHaveLength(0);
    });
  });

  describe('allOptions', () => {
    it('returns union of all options across all parent values (no duplicates)', () => {
      const dep = DependentOptions.of('parent', makeOptionMap());

      const all = dep.allOptions;

      expect(all).toHaveLength(3);
      expect(all.map((o) => o.key)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });

    it('deduplicates options that appear under multiple parent values', () => {
      const shared = FieldOption.of('shared', 'Shared');
      const optionMap = {
        p1: [shared, FieldOption.of('x', 'X')],
        p2: [shared], // same key appears again
      };
      const dep = DependentOptions.of('parent', optionMap);

      const all = dep.allOptions;

      const sharedCount = all.filter((o) => o.key === 'shared').length;
      expect(sharedCount).toBe(1);
    });
  });

  describe('optionMap getter', () => {
    it('exposes the raw option map for serialisation', () => {
      const map = makeOptionMap();
      const dep = DependentOptions.of('parent', map);

      expect(Object.keys(dep.optionMap)).toEqual(['cat1', 'cat2']);
    });
  });
});
