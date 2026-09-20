import { isParsedValueEmpty, parsedValuesEqual } from './form-field-parsed-value.util';

describe('form-field-parsed-value.util', () => {
  it('isParsedValueEmpty treats null, empty string, and empty array as empty', () => {
    expect(isParsedValueEmpty(null)).toBe(true);
    expect(isParsedValueEmpty('')).toBe(true);
    expect(isParsedValueEmpty([])).toBe(true);
    expect(isParsedValueEmpty('x')).toBe(false);
    expect(isParsedValueEmpty(['a'])).toBe(false);
  });

  it('parsedValuesEqual compares arrays by element', () => {
    expect(parsedValuesEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(parsedValuesEqual(['a'], ['b'])).toBe(false);
  });
});
