import { Form } from '../aggregates/form/form.aggregate';
import { FormAccessDeniedError, FormDisabledError } from '../errors/form.errors';
import { FormStatus } from '../enums/form-status.enum';
import { FormAccessPolicy } from './form-access.policy';

function makeForm(overrides: Partial<{
  managePermissions: string[];
  readPermissions: string[];
  writePermissions: string[];
  status: FormStatus;
}> = {}): Form {
  const form = Form.create({
    entityType: 'donation',
    key: 'intake',
    label: 'Intake',
    managePermissions: overrides.managePermissions ?? ['read:donations'],
    readPermissions: overrides.readPermissions ?? ['read:donations'],
    writePermissions: overrides.writePermissions ?? ['update:donation'],
  });
  if (overrides.status === FormStatus.Published) form.publish();
  if (overrides.status === FormStatus.Disabled) {
    form.publish();
    form.disable();
  }
  return form;
}

describe('FormAccessPolicy', () => {
  it('allows when user has required permission', () => {
    const form = makeForm();
    expect(() =>
      FormAccessPolicy.assertHasPermission(form, 'read', ['read:donations']),
    ).not.toThrow();
  });

  it('throws when user lacks required permission', () => {
    const form = makeForm();
    expect(() =>
      FormAccessPolicy.assertHasPermission(form, 'write', ['read:donations']),
    ).toThrow(FormAccessDeniedError);
  });

  it('throws when form is disabled', () => {
    const form = makeForm({ status: FormStatus.Disabled });
    expect(() => FormAccessPolicy.assertFormNotDisabled(form)).toThrow(FormDisabledError);
  });
});
