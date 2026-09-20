import { FieldOption } from '../field-option/field-option.vo';
import { InvalidFieldValueError } from '../../errors/form.errors';

/**
 * Immutable value object for two-level cascading select dropdowns.
 *
 * When a `CustomFieldDefinition` of type `select` or `multiselect` has
 * a `DependentOptions`, its available options are determined at read time
 * by looking up the current value of the parent field (`dependsOnKey`).
 *
 * Constraints enforced at definition time:
 *   - The parent field must be a `select` (single-choice) field.
 *   - The parent field must not itself be a dependent field (no chains).
 */
export class DependentOptions {
  private constructor(
    readonly dependsOnKey: string,
    private readonly _optionMap: Record<string, FieldOption[]>,
  ) {}

  static of(dependsOnKey: string, optionMap: Record<string, FieldOption[]>): DependentOptions {
    if (!dependsOnKey?.trim()) {
      throw new InvalidFieldValueError('DependentOptions dependsOnKey cannot be empty');
    }
    if (!Object.keys(optionMap).length) {
      throw new InvalidFieldValueError(
        'DependentOptions optionMap must have at least one parent-value entry',
      );
    }
    return new DependentOptions(dependsOnKey.trim(), optionMap);
  }

  /**
   * Returns the allowed child options for the given parent field value.
   * Returns an empty array when the parent has no value or no mapping exists.
   */
  getOptionsFor(parentValue: string | null): ReadonlyArray<FieldOption> {
    if (!parentValue) return [];
    return this._optionMap[parentValue] ?? [];
  }

  /** Union of all child options across every parent value. */
  get allOptions(): FieldOption[] {
    const seen = new Set<string>();
    const result: FieldOption[] = [];
    for (const opts of Object.values(this._optionMap)) {
      for (const opt of opts) {
        if (!seen.has(opt.key)) {
          seen.add(opt.key);
          result.push(opt);
        }
      }
    }
    return result;
  }

  /** Exposes the raw option map for serialisation (DB storage, DTO). */
  get optionMap(): Readonly<Record<string, ReadonlyArray<FieldOption>>> {
    return this._optionMap;
  }
}
