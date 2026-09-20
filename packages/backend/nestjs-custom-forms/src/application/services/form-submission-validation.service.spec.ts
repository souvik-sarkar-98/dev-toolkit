import { FormSubmissionValidationService } from './form-submission-validation.service';
import { Form } from '../../domain/aggregates/form/form.aggregate';
import { CustomFieldType } from '../../domain/enums/custom-field-type.enum';

describe('FormSubmissionValidationService', () => {
  const validation = new FormSubmissionValidationService();

  it('canSeeFormField allows all when viewPermissions empty', () => {
    const form = Form.create({
      entityType: 'donation',
      label: 'Test',
      key: 'test',
      createdBy: 'u1',
    });
    form.addField({
      key: 'f1',
      label: 'F1',
      fieldType: CustomFieldType.Text,
      sortOrder: 0,
      createdBy: 'u1',
    });
    const field = form.fields[0];
    expect(validation.canSeeFormField(field, [])).toBe(true);
  });

  it('validateVisibleFields reports missing mandatory visible fields', () => {
    const form = Form.create({
      entityType: 'donation',
      label: 'Test',
      key: 'test',
      createdBy: 'u1',
    });
    form.addField({
      key: 'required',
      label: 'Required',
      fieldType: CustomFieldType.Text,
      sortOrder: 0,
      mandatory: true,
      createdBy: 'u1',
    });
    const def = form.fields[0];
    const parsedByDefId = new Map([[def.id, null]]);
    const result = validation.validateVisibleFields(form, parsedByDefId, []);
    expect(result.missingMandatory).toContain('required');
  });
});
