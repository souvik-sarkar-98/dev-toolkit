import { describe, expect, it } from 'vitest';
import {
  findFirstFailedValidationRule,
  matchesValidationPattern,
  normalizeFieldValidationRules,
  validationErrorMessageForValue,
} from './validation-pattern.js';

describe('validation rules', () => {
  it('normalizes a single rule object', () => {
    expect(
      normalizeFieldValidationRules({
        pattern: '^a$',
        regexErrMsg: 'A only',
      }),
    ).toHaveLength(1);
  });

  it('normalizes an array of rules', () => {
    expect(
      normalizeFieldValidationRules([
        { key: 'min', pattern: '^.{2,}$', regexErrMsg: 'Too short' },
        { key: 'alpha', pattern: '^[A-Za-z]+$', regexErrMsg: 'Letters only' },
      ]),
    ).toHaveLength(2);
  });

  it('requires all rules to pass', () => {
    const rules = [
      { pattern: '^.{2,}$', regexErrMsg: 'Too short' },
      { pattern: '^[A-Za-z]+$', regexErrMsg: 'Letters only' },
    ];
    expect(matchesValidationPattern('text', 'Ab', rules)).toBe(true);
    expect(matchesValidationPattern('text', 'A1', rules)).toBe(false);
  });

  it('returns the first failing rule message', () => {
    const rules = [
      { pattern: '^.{5,}$', regexErrMsg: 'Min 5 chars' },
      { pattern: '^[0-9]+$', regexErrMsg: 'Digits only' },
    ];
    expect(validationErrorMessageForValue('text', 'Code', 'abc', rules)).toBe('Min 5 chars');
    expect(validationErrorMessageForValue('text', 'Code', '12345a', rules)).toBe('Digits only');
  });

  it('findFirstFailedValidationRule returns failed rule', () => {
    const rules = [{ key: 'fail', pattern: '^x$', regexErrMsg: 'Must be x' }];
    expect(findFirstFailedValidationRule('text', 'y', rules)?.key).toBe('fail');
  });
});
