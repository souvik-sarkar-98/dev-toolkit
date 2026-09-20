import { CustomFieldType } from '../../enums/custom-field-type.enum';
import { InvalidFieldDefinitionError } from '../../errors/form.errors';

const MAX_PATTERN_LENGTH = 500;
const MAX_PATTERN_COUNT = 20;

const PATTERN_ALLOWED_TYPES = new Set<CustomFieldType>([
  CustomFieldType.Text,
  CustomFieldType.Number,
  CustomFieldType.Date,
]);

export type FieldRegexRule = {
  readonly pattern: string;
  readonly regexErrMsg: string | undefined;
};

export type FieldValidationRulesRequestInput = {
  patterns: Array<{ pattern: string; regexErrMsg?: string }>;
};

export type FieldValidationRulesPersistedJson =
  | { pattern: string; regexErrMsg?: string }
  | { patterns: Array<{ pattern: string; regexErrMsg?: string }> };

/**
 * Immutable value object for regex-based field validation rules.
 *
 * Applied at definition time to text, number, and date fields only.
 * All configured patterns must match (AND). The UI uses patterns for
 * client-side validation; the server enforces the same rules on write and validate.
 */
export class FieldValidationRules {
  private constructor(readonly rules: readonly FieldRegexRule[]) {}

  get patterns(): readonly FieldRegexRule[] {
    return this.rules;
  }

  static of(
    pattern: string,
    regexErrMsg: string | undefined,
    fieldType: CustomFieldType,
  ): FieldValidationRules {
    return FieldValidationRules.ofRules([{ pattern, regexErrMsg }], fieldType);
  }

  static ofRules(
    entries: ReadonlyArray<{ pattern: string; regexErrMsg?: string }>,
    fieldType: CustomFieldType,
  ): FieldValidationRules {
    if (!PATTERN_ALLOWED_TYPES.has(fieldType)) {
      throw new InvalidFieldDefinitionError(
        `validationRules.pattern is only supported for text, number, and date field types`,
      );
    }

    if (!entries.length) {
      throw new InvalidFieldDefinitionError(
        'validationRules must include at least one pattern',
      );
    }
    if (entries.length > MAX_PATTERN_COUNT) {
      throw new InvalidFieldDefinitionError(
        `validationRules must not include more than ${MAX_PATTERN_COUNT} patterns`,
      );
    }

    const rules = entries.map((entry) => FieldValidationRules.normaliseRule(entry));
    return new FieldValidationRules(rules);
  }

  static fromRequestInput(
    input: FieldValidationRulesRequestInput,
    fieldType: CustomFieldType,
  ): FieldValidationRules {
    if (!input.patterns?.length) {
      throw new InvalidFieldDefinitionError(
        'validationRules.patterns must include at least one pattern',
      );
    }
    return FieldValidationRules.ofRules(input.patterns, fieldType);
  }

  /** Reconstruct from persisted JSON (`validationRulesJson` column). */
  static fromPersistedJson(json: FieldValidationRulesPersistedJson): FieldValidationRules {
    if ('patterns' in json && Array.isArray(json.patterns)) {
      return FieldValidationRules.fromPersistedRules(json.patterns);
    }
    if ('pattern' in json && typeof json.pattern === 'string') {
      return FieldValidationRules.fromPersistedRules([
        { pattern: json.pattern, regexErrMsg: json.regexErrMsg },
      ]);
    }
    throw new InvalidFieldDefinitionError('validationRules JSON is not valid');
  }

  /** Reconstruct from persisted data without re-validating field type. */
  static fromPersisted(pattern: string, regexErrMsg?: string): FieldValidationRules {
    return FieldValidationRules.fromPersistedRules([{ pattern, regexErrMsg }]);
  }

  static fromPersistedRules(
    entries: ReadonlyArray<{ pattern: string; regexErrMsg?: string }>,
  ): FieldValidationRules {
    const rules = entries.map((entry) => ({
      pattern: entry.pattern,
      regexErrMsg: entry.regexErrMsg || undefined,
    }));
    return new FieldValidationRules(rules);
  }

  /** Serialise for `validationRulesJson` persistence. */
  toPersistedJson(): { patterns: Array<{ pattern: string; regexErrMsg?: string }> } {
    return {
      patterns: this.rules.map((rule) =>
        rule.regexErrMsg
          ? { pattern: rule.pattern, regexErrMsg: rule.regexErrMsg }
          : { pattern: rule.pattern },
      ),
    };
  }

  matchesValue(fieldType: CustomFieldType, value: unknown): boolean {
    return this.findFailingRule(fieldType, value) === null;
  }

  /** Custom error message for the first pattern that fails, if any. */
  regexErrMsgForValue(fieldType: CustomFieldType, value: unknown): string | undefined {
    return this.findFailingRule(fieldType, value)?.regexErrMsg;
  }

  private findFailingRule(fieldType: CustomFieldType, value: unknown): FieldRegexRule | null {
    const candidate = FieldValidationRules.toMatchString(fieldType, value);
    if (candidate === null) return null;

    for (const rule of this.rules) {
      if (!new RegExp(rule.pattern).test(candidate)) {
        return rule;
      }
    }
    return null;
  }

  private static normaliseRule(entry: {
    pattern: string;
    regexErrMsg?: string;
  }): FieldRegexRule {
    const trimmed = entry.pattern?.trim();
    if (!trimmed) {
      throw new InvalidFieldDefinitionError('validationRules.pattern cannot be empty');
    }
    if (trimmed.length > MAX_PATTERN_LENGTH) {
      throw new InvalidFieldDefinitionError(
        `validationRules.pattern must not exceed ${MAX_PATTERN_LENGTH} characters`,
      );
    }

    try {
      // eslint-disable-next-line no-new
      new RegExp(trimmed);
    } catch {
      throw new InvalidFieldDefinitionError('validationRules.pattern is not a valid regular expression');
    }

    const regexErrMsg = entry.regexErrMsg;
    if (regexErrMsg !== undefined && regexErrMsg !== null && !String(regexErrMsg).trim()) {
      throw new InvalidFieldDefinitionError(
        'validationRules.regexErrMsg cannot be empty when provided',
      );
    }

    return {
      pattern: trimmed,
      regexErrMsg: regexErrMsg?.trim() || undefined,
    };
  }

  private static toMatchString(fieldType: CustomFieldType, value: unknown): string | null {
    switch (fieldType) {
      case CustomFieldType.Text:
      case CustomFieldType.Date:
        return typeof value === 'string' ? value : null;
      case CustomFieldType.Number:
        return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
      default:
        return null;
    }
  }
}
