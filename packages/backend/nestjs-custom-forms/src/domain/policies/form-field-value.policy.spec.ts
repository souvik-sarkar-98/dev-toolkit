import { CustomFieldType } from '../enums/custom-field-type.enum';
import { FieldValidationRuleViolatedError } from '../errors/form.errors';
import { FieldValidationRules } from '../value-objects/field-validation-rules/field-validation-rules.vo';
import { FormFieldValuePolicy } from './form-field-value.policy';

describe('FormFieldValuePolicy.assertPatternMatch', () => {
  const rules = FieldValidationRules.fromPersisted('^[A-Z]{2}$', 'Use two uppercase letters');

  it('no-ops when rules are null', () => {
    expect(() =>
      FormFieldValuePolicy.assertPatternMatch('code', CustomFieldType.Text, 'AB', null),
    ).not.toThrow();
  });

  it('passes when value matches pattern', () => {
    expect(() =>
      FormFieldValuePolicy.assertPatternMatch('code', CustomFieldType.Text, 'AB', rules),
    ).not.toThrow();
  });

  it('throws FieldValidationRuleViolatedError with custom message', () => {
    expect(() =>
      FormFieldValuePolicy.assertPatternMatch('code', CustomFieldType.Text, 'ab', rules),
    ).toThrow(FieldValidationRuleViolatedError);
  });
});
