import * as AwsCronParser from 'aws-cron-parser';
import { InvalidCronExpressionError } from '../errors/cron.errors';

/**
 * Normalize standard 5-part UNIX cron to 6-part Quartz/AWS format required by
 * aws-cron-parser (either DayOfMonth or DayOfWeek must be `?`).
 */
export function normalizeToQuartz(expression: string): string {
  const parts = expression.trim().split(/\s+/);

  if (parts.length === 5) {
    if (parts[2] === '*' && parts[4] === '*') {
      parts[4] = '?';
    } else if (parts[2] === '*') {
      parts[2] = '?';
    } else if (parts[4] === '*') {
      parts[4] = '?';
    }
    parts.push('*');
  }

  return parts.join(' ');
}

/**
 * Immutable value object wrapping a 5-part UNIX cron expression.
 * Validates on construction — throws InvalidCronExpressionError if unparseable.
 */
export class CronExpression {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static of(expression: string): CronExpression {
    const trimmed = expression.trim();
    try {
      AwsCronParser.parse(normalizeToQuartz(trimmed));
    } catch {
      throw new InvalidCronExpressionError(trimmed);
    }
    return new CronExpression(trimmed);
  }

  get value(): string {
    return this._value;
  }

  get normalized(): string {
    return normalizeToQuartz(this._value);
  }

  equals(other: CronExpression): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
