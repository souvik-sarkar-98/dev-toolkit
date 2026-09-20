import { CustomFieldType } from '../../enums/custom-field-type.enum';
import { InvalidFieldDefinitionError } from '../../errors/form.errors';
import { FieldValidationRules } from './field-validation-rules.vo';

describe('FieldValidationRules', () => {
  it('creates rules for text fields with pattern and message', () => {
    const rules = FieldValidationRules.of('^[a-z]+$', 'Lowercase only', CustomFieldType.Text);

    expect(rules.patterns[0].pattern).toBe('^[a-z]+$');
    expect(rules.patterns[0].regexErrMsg).toBe('Lowercase only');
    expect(rules.patterns).toHaveLength(1);
  });

  it('creates rules without regexErrMsg', () => {
    const rules = FieldValidationRules.of('^\\d+$', undefined, CustomFieldType.Number);

    expect(rules.patterns[0].regexErrMsg).toBeUndefined();
  });

  it('creates multiple patterns that must all match', () => {
    const rules = FieldValidationRules.ofRules(
      [
        { pattern: '^[a-z]+$', regexErrMsg: 'Lowercase only' },
        { pattern: '^.{3,}$', regexErrMsg: 'At least 3 characters' },
      ],
      CustomFieldType.Text,
    );

    expect(rules.patterns).toHaveLength(2);
    expect(rules.matchesValue(CustomFieldType.Text, 'abc')).toBe(true);
    expect(rules.matchesValue(CustomFieldType.Text, 'ab')).toBe(false);
    expect(rules.regexErrMsgForValue(CustomFieldType.Text, 'AB')).toBe('Lowercase only');
    expect(rules.regexErrMsgForValue(CustomFieldType.Text, 'ab')).toBe('At least 3 characters');
  });

  it('rejects empty pattern', () => {
    expect(() => FieldValidationRules.of('   ', undefined, CustomFieldType.Text)).toThrow(
      InvalidFieldDefinitionError,
    );
  });

  it('rejects invalid regex', () => {
    expect(() => FieldValidationRules.of('[', undefined, CustomFieldType.Text)).toThrow(
      InvalidFieldDefinitionError,
    );
  });

  it('rejects pattern longer than 500 characters', () => {
    expect(() =>
      FieldValidationRules.of('a'.repeat(501), undefined, CustomFieldType.Text),
    ).toThrow(InvalidFieldDefinitionError);
  });

  it('rejects rules on unsupported field types', () => {
    expect(() => FieldValidationRules.of('^a$', undefined, CustomFieldType.Select)).toThrow(
      InvalidFieldDefinitionError,
    );
  });

  it('rejects empty regexErrMsg when provided', () => {
    expect(() => FieldValidationRules.of('^a$', '   ', CustomFieldType.Text)).toThrow(
      InvalidFieldDefinitionError,
    );
  });

  it('rejects empty patterns in request input', () => {
    expect(() =>
      FieldValidationRules.fromRequestInput({ patterns: [] }, CustomFieldType.Text),
    ).toThrow(InvalidFieldDefinitionError);
  });

  it('matches text values against pattern', () => {
    const rules = FieldValidationRules.of('^hello$', undefined, CustomFieldType.Text);

    expect(rules.matchesValue(CustomFieldType.Text, 'hello')).toBe(true);
    expect(rules.matchesValue(CustomFieldType.Text, 'world')).toBe(false);
  });

  it('matches number values as stringified numbers', () => {
    const rules = FieldValidationRules.of('^\\d+$', undefined, CustomFieldType.Number);

    expect(rules.matchesValue(CustomFieldType.Number, 42)).toBe(true);
    expect(rules.matchesValue(CustomFieldType.Number, 4.2)).toBe(false);
  });

  it('reconstructs from legacy persisted single-pattern JSON', () => {
    const rules = FieldValidationRules.fromPersistedJson({ pattern: '^x$', regexErrMsg: 'Must be x' });

    expect(rules.patterns[0].pattern).toBe('^x$');
    expect(rules.patterns[0].regexErrMsg).toBe('Must be x');
  });

  it('reconstructs from persisted patterns array JSON', () => {
    const rules = FieldValidationRules.fromPersistedJson({
      patterns: [{ pattern: '^a$' }, { pattern: '^b$', regexErrMsg: 'Need b' }],
    });

    expect(rules.patterns).toHaveLength(2);
    expect(rules.toPersistedJson().patterns).toHaveLength(2);
  });

  it('reconstructs from persisted data', () => {
    const rules = FieldValidationRules.fromPersisted('^x$', 'Must be x');

    expect(rules.patterns[0].pattern).toBe('^x$');
    expect(rules.patterns[0].regexErrMsg).toBe('Must be x');
  });
});
