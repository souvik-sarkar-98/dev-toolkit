/**
 * CronExpression value-object unit tests.
 * Pure TypeScript — zero framework imports.
 *
 * Supersedes: test/cron/cron-expression.util.spec.ts (normalizeToQuartz coverage)
 */
import { CronExpression, normalizeToQuartz } from './cron-expression.vo';
import { InvalidCronExpressionError } from '../errors/cron.errors';

describe('normalizeToQuartz', () => {
  it('converts a 5-part expression where both day fields are "*" — dayOfWeek becomes "?"', () => {
    expect(normalizeToQuartz('0 10 * * *')).toBe('0 10 * * ? *');
  });

  it('sets dayOfMonth to "?" when dayOfWeek is constrained', () => {
    expect(normalizeToQuartz('0 10 * * 1')).toBe('0 10 ? * 1 *');
  });

  it('sets dayOfWeek to "?" when dayOfMonth is constrained', () => {
    expect(normalizeToQuartz('0 10 15 * *')).toBe('0 10 15 * ? *');
  });

  it('appends the year field (*) to a 5-part expression', () => {
    const result = normalizeToQuartz('*/30 * * * *');
    expect(result.split(' ')).toHaveLength(6);
  });

  it('leaves an already 6-part expression unchanged', () => {
    expect(normalizeToQuartz('0 10 * * ? *')).toBe('0 10 * * ? *');
  });

  it('trims surrounding whitespace before parsing', () => {
    expect(normalizeToQuartz('  0 10 * * *  ')).toBe('0 10 * * ? *');
  });
});

describe('CronExpression', () => {
  describe('of()', () => {
    it('accepts a well-formed 5-part cron expression', () => {
      expect(() => CronExpression.of('0 10 * * *')).not.toThrow();
    });

    it('accepts an every-30-minutes expression', () => {
      expect(() => CronExpression.of('*/30 * * * *')).not.toThrow();
    });

    it('accepts a day-of-week constrained expression', () => {
      expect(() => CronExpression.of('0 8 * * 1-5')).not.toThrow();
    });

    it('accepts a day-of-month constrained expression', () => {
      expect(() => CronExpression.of('0 0 1 * *')).not.toThrow();
    });

    it('throws InvalidCronExpressionError for a non-cron string', () => {
      expect(() => CronExpression.of('not-a-cron')).toThrow(InvalidCronExpressionError);
    });

    it('throws InvalidCronExpressionError for an out-of-range minute field', () => {
      expect(() => CronExpression.of('99 * * * *')).toThrow(InvalidCronExpressionError);
    });

    it('throws InvalidCronExpressionError for an empty string', () => {
      expect(() => CronExpression.of('')).toThrow(InvalidCronExpressionError);
    });

    it('throws InvalidCronExpressionError for a 3-part expression', () => {
      expect(() => CronExpression.of('0 10 *')).toThrow(InvalidCronExpressionError);
    });
  });

  describe('value getter', () => {
    it('returns the original (un-normalized) expression', () => {
      const expr = CronExpression.of('0 10 * * *');
      expect(expr.value).toBe('0 10 * * *');
    });
  });

  describe('normalized getter', () => {
    it('returns the Quartz/AWS 6-part representation', () => {
      const expr = CronExpression.of('0 10 * * *');
      expect(expr.normalized).toBe('0 10 * * ? *');
    });

    it('normalizes dayOfWeek-constrained expression correctly', () => {
      const expr = CronExpression.of('0 8 * * 1');
      expect(expr.normalized).toBe('0 8 ? * 1 *');
    });
  });

  describe('equals()', () => {
    it('returns true for two expressions created from the same string', () => {
      const a = CronExpression.of('0 10 * * *');
      const b = CronExpression.of('0 10 * * *');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for two expressions created from different strings', () => {
      const a = CronExpression.of('0 10 * * *');
      const b = CronExpression.of('0 8 * * *');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns the raw expression value', () => {
      const expr = CronExpression.of('*/15 * * * *');
      expect(expr.toString()).toBe('*/15 * * * *');
    });
  });
});
