import { InvalidFormKeyError } from '../errors/form.errors';
import { FormKeyPolicy } from './form-key.policy';

describe('FormKeyPolicy', () => {
  it('accepts valid keys', () => {
    expect(() => FormKeyPolicy.assertValidKey('intake_form')).not.toThrow();
    expect(() => FormKeyPolicy.assertValidKey('complianceV2')).not.toThrow();
  });

  it('rejects keys with spaces', () => {
    expect(() => FormKeyPolicy.assertValidKey('intake form')).toThrow(InvalidFormKeyError);
  });

  it('rejects keys starting with a digit', () => {
    expect(() => FormKeyPolicy.assertValidKey('1form')).toThrow(InvalidFormKeyError);
  });
});
