import { InvalidFieldValueError } from '../../errors/form.errors';

export type FieldConditionOperator = 'equals' | 'not_equals' | 'in' | 'not_in';

export type CustomFieldValueParsed = string | number | boolean | string[] | null;

/**
 * Immutable value object expressing a conditional visibility/requirement rule.
 *
 * A definition with a condition is only shown (and its mandatory constraint
 * only enforced) when the condition is satisfied by the current value of the
 * field identified by `dependsOnKey`.
 *
 * Operator semantics:
 *   equals     — currentValue === value
 *   not_equals — currentValue !== value
 *   in         — value array includes currentValue
 *   not_in     — value array does not include currentValue
 */
export class FieldCondition {
  private constructor(
    readonly dependsOnKey: string,
    readonly operator: FieldConditionOperator,
    readonly value: string | number | boolean | string[],
  ) {}

  static of(
    dependsOnKey: string,
    operator: FieldConditionOperator,
    value: string | number | boolean | string[],
  ): FieldCondition {
    if (!dependsOnKey?.trim()) {
      throw new InvalidFieldValueError('FieldCondition dependsOnKey cannot be empty');
    }
    return new FieldCondition(dependsOnKey.trim(), operator, value);
  }

  isSatisfiedBy(currentValue: CustomFieldValueParsed): boolean {
    if (currentValue === null || currentValue === undefined) return false;

    switch (this.operator) {
      case 'equals':
        return currentValue === this.value;
      case 'not_equals':
        return currentValue !== this.value;
      case 'in': {
        const opts = this.value as string[];
        if (Array.isArray(currentValue)) {
          return (currentValue as string[]).some((v) => opts.includes(v));
        }
        return opts.includes(currentValue as string);
      }
      case 'not_in': {
        const opts = this.value as string[];
        if (Array.isArray(currentValue)) {
          return !(currentValue as string[]).some((v) => opts.includes(v));
        }
        return !opts.includes(currentValue as string);
      }
    }
  }
}
