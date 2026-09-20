import { describe, expect, it } from 'vitest';
import {
  formatCsvQueryParam,
  parseBooleanQueryParam,
  parseCsvQueryParam,
  parseStringQueryParam,
  valuesEqual,
} from './list-route-query.util.js';

describe('list-route-query.util', () => {
  it('parseCsvQueryParam splits and trims', () => {
    expect(parseCsvQueryParam('RAISED, PENDING')).toEqual(['RAISED', 'PENDING']);
    expect(parseCsvQueryParam('')).toBeUndefined();
    expect(parseCsvQueryParam(null)).toBeUndefined();
  });

  it('formatCsvQueryParam joins or omits', () => {
    expect(formatCsvQueryParam(['A', 'B'])).toBe('A,B');
    expect(formatCsvQueryParam([])).toBeNull();
    expect(formatCsvQueryParam(undefined)).toBeNull();
  });

  it('parseStringQueryParam trims empty', () => {
    expect(parseStringQueryParam('  x  ')).toBe('x');
    expect(parseStringQueryParam('')).toBeUndefined();
  });

  it('parseBooleanQueryParam recognizes true values', () => {
    expect(parseBooleanQueryParam('true')).toBe(true);
    expect(parseBooleanQueryParam('1')).toBe(true);
    expect(parseBooleanQueryParam('false')).toBe(false);
  });

  it('valuesEqual compares arrays', () => {
    expect(valuesEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(valuesEqual(['a'], ['b'])).toBe(false);
  });
});
